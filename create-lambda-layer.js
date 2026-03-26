#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

const LAYER_DIR = 'lambda-layer-temp';
const NODE_MODULES_DIR = path.join(LAYER_DIR, 'nodejs', 'node_modules');
const ZIP_PATH = 'lambda-layer.zip';

console.log('=== CREATING LAMBDA LAYER ===\n');

// Verify AWS
console.log('Verifying AWS credentials...');
try {
  const identity = JSON.parse(execSync('aws sts get-caller-identity --output json').toString());
  console.log(`[OK] Account: ${identity.Account}\n`);
} catch (error) {
  console.error('[FAIL] AWS not configured');
  process.exit(1);
}

// Create directories
console.log('Creating layer structure...');
if (fs.existsSync(LAYER_DIR)) {
  fs.rmSync(LAYER_DIR, { recursive: true, force: true });
}
fs.mkdirSync(NODE_MODULES_DIR, { recursive: true });
console.log('[OK] Directories created\n');

// Copy node_modules
console.log('Copying dependencies...');
const src = 'packages/backend/node_modules';
if (!fs.existsSync(src)) {
  console.error('[FAIL] node_modules not found');
  process.exit(1);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

copyDir(src, NODE_MODULES_DIR);
console.log('[OK] Dependencies copied\n');

// Create zip
console.log('Creating zip file...');
const output = fs.createWriteStream(ZIP_PATH);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const size = (archive.pointer() / (1024 * 1024)).toFixed(2);
  console.log(`[OK] Zip created (${size} MB)\n`);
  
  // Publish layer
  console.log('Publishing layer to AWS...');
  try {
    const result = JSON.parse(
      execSync(`aws lambda publish-layer-version --layer-name misra-dependencies --zip-file fileb://${ZIP_PATH} --compatible-runtimes nodejs20.x --output json`).toString()
    );
    const layerArn = result.LayerVersionArn;
    console.log(`[OK] Layer published: ${layerArn}\n`);
    
    // Attach to functions
    console.log('Attaching layer to functions...');
    const functions = JSON.parse(execSync('aws lambda list-functions --output json').toString());
    const misraFuncs = functions.Functions.filter(f => f.FunctionName.startsWith('misra-'));
    
    let success = 0;
    misraFuncs.forEach(func => {
      try {
        execSync(`aws lambda update-function-configuration --function-name ${func.FunctionName} --layers ${layerArn} --output json`);
        success++;
      } catch (e) {
        console.log(`  [WARN] Failed to update ${func.FunctionName}`);
      }
    });
    
    console.log(`[OK] Updated ${success} functions\n`);
    
    // Cleanup
    console.log('Cleaning up...');
    fs.rmSync(LAYER_DIR, { recursive: true, force: true });
    fs.unlinkSync(ZIP_PATH);
    console.log('[OK] Done\n');
    
    console.log('=== LAMBDA LAYER DEPLOYED ===');
    console.log('All functions now have dependencies via Lambda Layer');
    
  } catch (error) {
    console.error(`[FAIL] ${error.message}`);
    process.exit(1);
  }
});

archive.on('error', (err) => {
  console.error(`[FAIL] ${err.message}`);
  process.exit(1);
});

archive.pipe(output);
archive.directory(LAYER_DIR, false);
archive.finalize();
