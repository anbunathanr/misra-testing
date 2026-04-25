#!/usr/bin/env node

/**
 * Production Deployment Script
 * 
 * Forces a fresh build with correct environment variables and deploys to Vercel
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting production deployment...');

// 1. Clean previous builds
console.log('🧹 Cleaning previous builds...');
try {
  if (process.platform === 'win32') {
    execSync('rmdir /s /q dist', { stdio: 'inherit' });
    execSync('rmdir /s /q .vercel', { stdio: 'inherit' });
  } else {
    execSync('rm -rf dist', { stdio: 'inherit' });
    execSync('rm -rf .vercel', { stdio: 'inherit' });
  }
} catch (error) {
  console.log('⚠️ Clean failed (expected if no previous builds)');
}

// 2. Verify environment variables
console.log('🔧 Verifying environment variables...');
const envPath = path.join(__dirname, '.env.production');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.production file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
console.log('📋 Environment file content:');
console.log(envContent);

// 3. Build with production environment
console.log('🔨 Building with production environment...');
try {
  execSync('npm run build', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      VITE_BUILD_TIMESTAMP: Date.now().toString()
    }
  });
} catch (error) {
  console.error('❌ Build failed!');
  process.exit(1);
}

// 4. Deploy to Vercel
console.log('☁️ Deploying to Vercel...');
try {
  execSync('npx vercel --prod --yes', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Deployment failed!');
  process.exit(1);
}

console.log('✅ Production deployment completed successfully!');
console.log('🌐 Check https://aibts-platform.vercel.app');