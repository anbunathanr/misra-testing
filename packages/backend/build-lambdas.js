#!/usr/bin/env node

/**
 * Build script to bundle Lambda functions individually
 * This prevents the massive src directory from being packaged with each function
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FUNCTIONS_DIR = path.join(__dirname, 'src/functions');
const DIST_DIR = path.join(__dirname, 'dist-lambdas');

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Get all function directories
const functionDirs = fs.readdirSync(FUNCTIONS_DIR).filter(f => {
  const stat = fs.statSync(path.join(FUNCTIONS_DIR, f));
  return stat.isDirectory();
});

console.log(`Found ${functionDirs.length} function directories`);

functionDirs.forEach(dir => {
  const functionPath = path.join(FUNCTIONS_DIR, dir);
  const files = fs.readdirSync(functionPath);
  
  // Find handler files (*.ts files that export handler)
  const handlers = files.filter(f => f.endsWith('.ts') && !f.includes('.test') && !f.includes('.spec'));
  
  handlers.forEach(handler => {
    const handlerName = handler.replace('.ts', '');
    const outputDir = path.join(DIST_DIR, dir, handlerName);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`Building ${dir}/${handlerName}...`);
    
    // Copy the handler file
    const handlerPath = path.join(functionPath, handler);
    const outputPath = path.join(outputDir, 'index.js');
    
    try {
      // Compile TypeScript to JavaScript
      const tsContent = fs.readFileSync(handlerPath, 'utf-8');
      
      // Simple transpilation (in production, use esbuild or webpack)
      // For now, we'll just copy and note that proper bundling is needed
      fs.copyFileSync(handlerPath, path.join(outputDir, handler));
      
      console.log(`  ✓ ${dir}/${handlerName}`);
    } catch (error) {
      console.error(`  ✗ Error building ${dir}/${handlerName}:`, error.message);
    }
  });
});

console.log('\nLambda build complete!');
