#!/usr/bin/env node

/**
 * esbuild configuration for bundling Lambda functions
 * Each function is bundled separately with only its dependencies
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const FUNCTIONS_DIR = path.join(__dirname, 'src/functions');
const DIST_DIR = path.join(__dirname, 'dist-lambdas');
const ZIP_DIR = path.join(__dirname, 'dist-zips');

// Ensure dist and zip directories exist
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}
if (!fs.existsSync(ZIP_DIR)) {
  fs.mkdirSync(ZIP_DIR, { recursive: true });
}

// Get all function directories
const functionDirs = fs.readdirSync(FUNCTIONS_DIR).filter(f => {
  const stat = fs.statSync(path.join(FUNCTIONS_DIR, f));
  return stat.isDirectory();
});

console.log(`Building ${functionDirs.length} Lambda functions...\n`);

const buildPromises = [];

functionDirs.forEach(dir => {
  const functionPath = path.join(FUNCTIONS_DIR, dir);
  const files = fs.readdirSync(functionPath);
  
  // Find handler files (*.ts files that export handler)
  const handlers = files.filter(f => f.endsWith('.ts') && !f.includes('.test') && !f.includes('.spec'));
  
  handlers.forEach(handler => {
    const handlerName = handler.replace('.ts', '');
    const outputDir = path.join(DIST_DIR, dir, handlerName);
    const zipDir = path.join(ZIP_DIR, dir, handlerName);
    const entryPoint = path.join(functionPath, handler);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    if (!fs.existsSync(zipDir)) {
      fs.mkdirSync(zipDir, { recursive: true });
    }
    
    const buildPromise = esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      platform: 'node',
      target: 'node20',
      outfile: path.join(outputDir, 'index.js'),
      external: ['aws-sdk', 'aws-lambda'],
      minify: true,
      sourcemap: false,
      logLevel: 'silent',
    }).then(() => {
      console.log(`Built: ${dir}/${handlerName}`);
      
      // Create zip file for Lambda deployment
      const zipFile = path.join(zipDir, 'index.zip');
      const output = fs.createWriteStream(zipFile);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        console.log(`Zipped: ${dir}/${handlerName} (${archive.pointer()} bytes)`);
      });
      
      archive.on('error', (err) => {
        throw err;
      });
      
      archive.pipe(output);
      archive.file(path.join(outputDir, 'index.js'), { name: 'index.js' });
      return archive.finalize();
      
    }).catch(error => {
      console.error(`Failed: ${dir}/${handlerName}: ${error.message}`);
      process.exit(1);
    });
    
    buildPromises.push(buildPromise);
  });
});

Promise.all(buildPromises).then(() => {
  console.log('\nAll Lambda functions built and zipped successfully!');
}).catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});
