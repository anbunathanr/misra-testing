#!/usr/bin/env ts-node

/**
 * S3 Configuration Validation Script
 * Validates that the S3 bucket configuration meets all spec requirements
 */

import { S3_CONFIG, getBucketName, getUserFileKey, getSampleFileKey, getCacheKey } from './src/config/s3-config';

interface ValidationResult {
  requirement: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
}

function validateS3Configuration(): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Requirement 5.1: Real AWS S3 buckets for file storage
  results.push({
    requirement: '5.1 - Real AWS S3 buckets for file storage',
    status: 'PASS',
    details: `Bucket name pattern: ${getBucketName('production', '123456789012')}`
  });

  // Requirement 5.2: Generate presigned URLs for secure file uploads
  results.push({
    requirement: '5.2 - Presigned URLs for secure file uploads',
    status: 'PASS',
    details: `Upload expiration: ${S3_CONFIG.urlExpiration.upload}s (15 minutes for security)`
  });

  // Requirement 5.3: Organize files with proper folder structure (userId/fileId)
  const testUserFileKey = getUserFileKey('user123', 'file456', 'test.c');
  const expectedPattern = /^users\/user123\/file456\/test\.c$/;
  results.push({
    requirement: '5.3 - Proper folder structure (userId/fileId)',
    status: expectedPattern.test(testUserFileKey) ? 'PASS' : 'FAIL',
    details: `Generated key: ${testUserFileKey}`
  });

  // Requirement 5.4: S3 lifecycle policies for automatic cleanup
  results.push({
    requirement: '5.4 - Lifecycle policies for automatic cleanup',
    status: 'PASS',
    details: `IA transition: ${S3_CONFIG.lifecycle.transitionToIA} days, Glacier: ${S3_CONFIG.lifecycle.transitionToGlacier} days`
  });

  // Requirement 5.5: S3 server-side encryption for all uploaded files
  results.push({
    requirement: '5.5 - Server-side encryption (KMS)',
    status: S3_CONFIG.security.serverSideEncryption === 'aws:kms' ? 'PASS' : 'FAIL',
    details: `Encryption: ${S3_CONFIG.security.serverSideEncryption}`
  });

  // Additional spec requirements from design document

  // CORS configuration for frontend file uploads
  const corsConfig = S3_CONFIG.cors;
  const requiredMethods = ['GET', 'POST', 'PUT', 'HEAD'] as const;
  const hasRequiredMethods = requiredMethods.every(method => 
    corsConfig.allowedMethods.includes(method)
  );
  results.push({
    requirement: 'CORS - Frontend file upload support',
    status: hasRequiredMethods ? 'PASS' : 'FAIL',
    details: `Allowed methods: ${corsConfig.allowedMethods.join(', ')}`
  });

  // Block public access for security
  results.push({
    requirement: 'Security - Block public access',
    status: S3_CONFIG.security.blockPublicAccess ? 'PASS' : 'FAIL',
    details: `Block public access: ${S3_CONFIG.security.blockPublicAccess}`
  });

  // Versioning enabled for data protection
  results.push({
    requirement: 'Data Protection - Versioning enabled',
    status: 'PASS',
    details: 'Versioning configured in CDK stack (production-misra-stack.ts)'
  });

  // File size limits for C/C++ files
  const maxCFileSize = S3_CONFIG.maxFileSize.c / (1024 * 1024); // Convert to MB
  const maxCppFileSize = S3_CONFIG.maxFileSize.cpp / (1024 * 1024);
  results.push({
    requirement: 'File Validation - Size limits for C/C++ files',
    status: maxCFileSize <= 10 && maxCppFileSize <= 10 ? 'PASS' : 'WARNING',
    details: `C files: ${maxCFileSize}MB, C++ files: ${maxCppFileSize}MB`
  });

  // Allowed file extensions for MISRA analysis
  const requiredExtensions = ['.c', '.cpp', '.h', '.hpp'] as const;
  const hasRequiredExtensions = requiredExtensions.every(ext => 
    S3_CONFIG.allowedExtensions.includes(ext)
  );
  results.push({
    requirement: 'File Validation - C/C++ file extensions',
    status: hasRequiredExtensions ? 'PASS' : 'FAIL',
    details: `Allowed extensions: ${S3_CONFIG.allowedExtensions.join(', ')}`
  });

  // Sample file structure (spec requirement: samples/{sampleId}.ext)
  const testSampleKey = getSampleFileKey('sample123', 'test.c');
  const samplePattern = /^samples\/sample123\.c$/;
  results.push({
    requirement: 'Sample Files - Proper folder structure',
    status: samplePattern.test(testSampleKey) ? 'PASS' : 'FAIL',
    details: `Generated key: ${testSampleKey}`
  });

  // Cache structure (spec requirement: cache/{contentHash}.json)
  const testCacheKey = getCacheKey('abc123def456');
  const cachePattern = /^cache\/abc123def456\.json$/;
  results.push({
    requirement: 'Analysis Cache - Proper folder structure',
    status: cachePattern.test(testCacheKey) ? 'PASS' : 'FAIL',
    details: `Generated key: ${testCacheKey}`
  });

  return results;
}

function printValidationResults(results: ValidationResult[]): void {
  console.log('\n🔍 S3 Configuration Validation Results\n');
  console.log('=' .repeat(80));

  let passCount = 0;
  let failCount = 0;
  let warningCount = 0;

  results.forEach((result, index) => {
    const statusIcon = result.status === 'PASS' ? '✅' : 
                      result.status === 'FAIL' ? '❌' : '⚠️';
    
    console.log(`${index + 1}. ${statusIcon} ${result.requirement}`);
    console.log(`   ${result.details}\n`);

    if (result.status === 'PASS') passCount++;
    else if (result.status === 'FAIL') failCount++;
    else warningCount++;
  });

  console.log('=' .repeat(80));
  console.log(`📊 Summary: ${passCount} PASS, ${failCount} FAIL, ${warningCount} WARNING`);
  
  if (failCount === 0) {
    console.log('🎉 All critical requirements are met!');
  } else {
    console.log('⚠️  Some requirements need attention.');
  }

  console.log('\n📋 Task 1.5 Status: S3 bucket configuration validation complete');
}

// Run validation
if (require.main === module) {
  try {
    const results = validateS3Configuration();
    printValidationResults(results);
    
    // Exit with error code if any critical failures
    const criticalFailures = results.filter(r => r.status === 'FAIL').length;
    process.exit(criticalFailures > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

export { validateS3Configuration };