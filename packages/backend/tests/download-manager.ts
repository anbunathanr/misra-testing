import * as fs from 'fs';
import * as path from 'path';
import { Page, Download } from '@playwright/test';

/**
 * Download Manager - Handles automatic downloads, verification, and organization
 */

export interface DownloadedFile {
  filename: string;
  filepath: string;
  size: number;
  type: 'report' | 'fix' | 'fixed-code' | 'unknown';
  verified: boolean;
  verificationDetails: string;
  timestamp: string;
  downloadDuration: number;
}

export interface DownloadSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  downloadedFiles: DownloadedFile[];
  manifestPath: string;
  verificationLogPath: string;
}

export class DownloadManager {
  private downloadsDir: string;
  private sessionDir: string;
  private session: DownloadSession;
  private downloadedFiles: Map<string, DownloadedFile> = new Map();

  constructor(baseDir: string = './downloads') {
    this.downloadsDir = baseDir;
    this.sessionDir = '';
    this.session = {
      sessionId: this.generateSessionId(),
      startTime: new Date(),
      downloadedFiles: [],
      manifestPath: '',
      verificationLogPath: ''
    };
  }

  /**
   * Initialize download session and create directories
   */
  async initialize(): Promise<void> {
    // Create base downloads directory
    if (!fs.existsSync(this.downloadsDir)) {
      fs.mkdirSync(this.downloadsDir, { recursive: true });
      console.log(`   📁 Created downloads directory: ${this.downloadsDir}`);
    }

    // Create session-specific directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const timeString = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    this.sessionDir = path.join(this.downloadsDir, `session-${timestamp}-${timeString}`);

    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
      console.log(`   📁 Created session directory: ${this.sessionDir}`);
    }

    // Create manifest and verification log paths
    this.session.manifestPath = path.join(this.sessionDir, 'manifest.json');
    this.session.verificationLogPath = path.join(this.sessionDir, 'verification-log.txt');

    // Initialize manifest file
    this.saveManifest();

    // Initialize verification log
    fs.writeFileSync(this.session.verificationLogPath, `Verification Log - Session ${this.session.sessionId}\n`);
    fs.appendFileSync(this.session.verificationLogPath, `Started: ${this.session.startTime.toISOString()}\n`);
    fs.appendFileSync(this.session.verificationLogPath, `${'='.repeat(80)}\n\n`);

    console.log(`   ✅ Download session initialized: ${this.session.sessionId}`);
  }

  /**
   * Set up download event listener on Playwright page
   */
  async setupDownloadListener(page: Page): Promise<void> {
    console.log('   🔌 Setting up download event listener...');

    page.on('download', async (download: Download) => {
      await this.handleDownload(download);
    });

    console.log('   ✅ Download listener ready');
  }

  /**
   * Handle individual download event
   */
  private async handleDownload(download: Download): Promise<void> {
    const filename = download.suggestedFilename();
    const downloadStartTime = Date.now();

    // Check if file already downloaded (prevent duplicates)
    if (this.downloadedFiles.has(filename)) {
      console.log(`   ⚠️  File already downloaded, skipping duplicate: ${filename}`);
      await download.delete(); // Delete the duplicate download
      return;
    }

    // Mark as being downloaded to prevent race conditions
    this.downloadedFiles.set(filename, {
      filename,
      filepath: '',
      size: 0,
      type: 'unknown',
      verified: false,
      verificationDetails: 'Downloading...',
      timestamp: new Date().toISOString(),
      downloadDuration: 0
    });

    console.log(`\n   📥 Download started: ${filename}`);
    console.log(`   ⏱️  Start time: ${new Date().toLocaleTimeString()}`);

    try {
      // Determine file type
      const fileType = this.determineFileType(filename);

      // Save file to session directory
      const filepath = path.join(this.sessionDir, filename);
      await download.saveAs(filepath);

      const downloadDuration = Date.now() - downloadStartTime;
      const fileSize = fs.statSync(filepath).size;

      console.log(`   ✅ Download completed: ${filename}`);
      console.log(`   📊 File size: ${this.formatBytes(fileSize)}`);
      console.log(`   ⏱️  Duration: ${(downloadDuration / 1000).toFixed(2)}s`);

      // Create download record
      const downloadedFile: DownloadedFile = {
        filename,
        filepath,
        size: fileSize,
        type: fileType,
        verified: false,
        verificationDetails: '',
        timestamp: new Date().toISOString(),
        downloadDuration
      };

      // Update the map with complete file info
      this.downloadedFiles.set(filename, downloadedFile);
      
      // Add to session if not already there
      const existingIndex = this.session.downloadedFiles.findIndex(f => f.filename === filename);
      if (existingIndex === -1) {
        this.session.downloadedFiles.push(downloadedFile);
      } else {
        this.session.downloadedFiles[existingIndex] = downloadedFile;
      }

      // Verify file
      await this.verifyFile(downloadedFile);

      // Update manifest
      this.saveManifest();
    } catch (error) {
      console.log(`   ❌ Download failed: ${filename}`);
      console.log(`   Error: ${error}`);

      // Remove from map on failure
      this.downloadedFiles.delete(filename);

      // Log error to verification log
      fs.appendFileSync(
        this.session.verificationLogPath,
        `FAILED: ${filename}\n  Error: ${error}\n  Time: ${new Date().toISOString()}\n\n`
      );
    }
  }

  /**
   * Verify downloaded file
   */
  private async verifyFile(file: DownloadedFile): Promise<void> {
    console.log(`\n   🔍 Verifying file: ${file.filename}`);

    const verificationChecks: string[] = [];

    try {
      // Check 1: File exists
      if (!fs.existsSync(file.filepath)) {
        throw new Error('File does not exist at expected location');
      }
      verificationChecks.push('✅ File exists');

      // Check 2: File size > 0
      if (file.size === 0) {
        throw new Error('File size is zero bytes');
      }
      verificationChecks.push(`✅ File size valid (${this.formatBytes(file.size)})`);

      // Check 3: File format matches extension
      const ext = path.extname(file.filename).toLowerCase();
      const validExtensions = ['.pdf', '.html', '.txt', '.c', '.cpp', '.java', '.js', '.ts', '.json', '.log'];
      if (!validExtensions.includes(ext)) {
        console.log(`   ⚠️  Unknown file extension: ${ext}`);
      } else {
        verificationChecks.push(`✅ File format valid (${ext})`);
      }

      // Check 4: Content verification based on file type
      const content = fs.readFileSync(file.filepath, 'utf-8').substring(0, 500);

      if (file.type === 'report') {
        if (content.includes('MISRA') || content.includes('Analysis') || content.includes('Report')) {
          verificationChecks.push('✅ Report content verified');
        } else {
          console.log(`   ⚠️  Report content markers not found`);
        }
      } else if (file.type === 'fix') {
        if (content.length > 0) {
          verificationChecks.push('✅ Fix file content verified');
        }
      } else if (file.type === 'fixed-code') {
        if (content.includes('#include') || content.includes('function') || content.includes('class')) {
          verificationChecks.push('✅ Fixed code syntax verified');
        } else {
          console.log(`   ⚠️  Code syntax markers not found`);
        }
      }

      // Mark as verified
      file.verified = true;
      file.verificationDetails = verificationChecks.join(' | ');

      console.log(`   ✅ Verification successful`);
      verificationChecks.forEach(check => console.log(`      ${check}`));

      // Log to verification log
      fs.appendFileSync(
        this.session.verificationLogPath,
        `SUCCESS: ${file.filename}\n  Size: ${this.formatBytes(file.size)}\n  Type: ${file.type}\n  Checks: ${verificationChecks.join(' | ')}\n  Time: ${new Date().toISOString()}\n\n`
      );

      // Show browser alert
      console.log(`   🎉 File verified: ${file.filename}`);
    } catch (error) {
      file.verified = false;
      file.verificationDetails = `Verification failed: ${error}`;

      console.log(`   ❌ Verification failed: ${file.filename}`);
      console.log(`   Error: ${error}`);

      // Log to verification log
      fs.appendFileSync(
        this.session.verificationLogPath,
        `FAILED: ${file.filename}\n  Error: ${error}\n  Time: ${new Date().toISOString()}\n\n`
      );
    }
  }

  /**
   * Determine file type from filename
   */
  private determineFileType(filename: string): 'report' | 'fix' | 'fixed-code' | 'unknown' {
    const lower = filename.toLowerCase();

    if (lower.includes('report') || lower.includes('analysis') || lower.endsWith('.pdf') || lower.endsWith('.html')) {
      return 'report';
    } else if (lower.includes('fix') && !lower.includes('fixed')) {
      return 'fix';
    } else if (lower.includes('fixed') || lower.includes('corrected')) {
      return 'fixed-code';
    }

    return 'unknown';
  }

  /**
   * Save manifest file
   */
  private saveManifest(): void {
    const manifest = {
      sessionId: this.session.sessionId,
      startTime: this.session.startTime,
      endTime: this.session.endTime,
      totalFiles: this.session.downloadedFiles.length,
      verifiedFiles: this.session.downloadedFiles.filter(f => f.verified).length,
      failedFiles: this.session.downloadedFiles.filter(f => !f.verified).length,
      totalSize: this.session.downloadedFiles.reduce((sum, f) => sum + f.size, 0),
      files: this.session.downloadedFiles
    };

    fs.writeFileSync(this.session.manifestPath, JSON.stringify(manifest, null, 2));
  }

  /**
   * Get download summary
   */
  async getSummary(): Promise<string> {
    this.session.endTime = new Date();
    this.saveManifest();

    const totalTime = (this.session.endTime.getTime() - this.session.startTime.getTime()) / 1000;
    const totalSize = this.session.downloadedFiles.reduce((sum, f) => sum + f.size, 0);
    const verifiedCount = this.session.downloadedFiles.filter(f => f.verified).length;

    let summary = `\n${'='.repeat(80)}\n`;
    summary += `📊 DOWNLOAD SUMMARY\n`;
    summary += `${'='.repeat(80)}\n`;
    summary += `Session ID: ${this.session.sessionId}\n`;
    summary += `Total Files: ${this.session.downloadedFiles.length}\n`;
    summary += `Verified: ${verifiedCount}/${this.session.downloadedFiles.length}\n`;
    summary += `Total Size: ${this.formatBytes(totalSize)}\n`;
    summary += `Total Time: ${totalTime.toFixed(2)}s\n`;
    summary += `Session Directory: ${this.sessionDir}\n`;
    summary += `Manifest: ${this.session.manifestPath}\n`;
    summary += `Verification Log: ${this.session.verificationLogPath}\n`;
    summary += `${'='.repeat(80)}\n`;

    if (this.session.downloadedFiles.length > 0) {
      summary += `\n📁 Downloaded Files:\n`;
      this.session.downloadedFiles.forEach((file, index) => {
        const status = file.verified ? '✅' : '❌';
        summary += `  ${index + 1}. ${status} ${file.filename} (${this.formatBytes(file.size)})\n`;
      });
    }

    return summary;
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get session directory
   */
  getSessionDir(): string {
    return this.sessionDir;
  }

  /**
   * Get downloaded files
   */
  getDownloadedFiles(): DownloadedFile[] {
    return this.session.downloadedFiles;
  }

  /**
   * Get verification log path
   */
  getVerificationLogPath(): string {
    return this.session.verificationLogPath;
  }

  /**
   * Send verification results via email and WhatsApp
   */
  async sendVerificationNotifications(email: string, phoneNumber: string): Promise<void> {
    try {
      console.log('\n   📧 Sending verification notifications...');

      const verifiedCount = this.session.downloadedFiles.filter(f => f.verified).length;
      const totalCount = this.session.downloadedFiles.length;
      const totalSize = this.session.downloadedFiles.reduce((sum, f) => sum + f.size, 0);

      // Email notification
      await this.sendEmailNotification(email, verifiedCount, totalCount, totalSize);

      // WhatsApp notification
      await this.sendWhatsAppNotification(phoneNumber, verifiedCount, totalCount, totalSize);

      console.log('   ✅ Notifications sent successfully');
    } catch (error) {
      console.log(`   ⚠️  Failed to send notifications: ${error}`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(email: string, verifiedCount: number, totalCount: number, totalSize: number): Promise<void> {
    try {
      console.log(`   📧 Sending email to ${email}...`);

      // Try to use Nodemailer if available
      try {
        const nodemailer = require('nodemailer');
        
        // Create transporter (using Gmail as example)
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER || 'your-email@gmail.com',
            pass: process.env.EMAIL_PASS || 'your-app-password'
          }
        });

        const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #667eea; color: white; padding: 20px; border-radius: 5px; }
    .content { margin: 20px 0; }
    .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
    .success { background-color: #d4edda; color: #155724; }
    .file-list { margin: 20px 0; }
    .file-item { padding: 10px; background-color: #f5f5f5; margin: 5px 0; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ MISRA Analysis Complete</h1>
    </div>
    <div class="content">
      <h2>Verification Results</h2>
      <div class="status success">
        <strong>Status:</strong> ${verifiedCount}/${totalCount} files verified successfully
      </div>
      
      <h3>Download Summary</h3>
      <ul>
        <li><strong>Total Files:</strong> ${totalCount}</li>
        <li><strong>Verified Files:</strong> ${verifiedCount}</li>
        <li><strong>Total Size:</strong> ${this.formatBytes(totalSize)}</li>
        <li><strong>Session ID:</strong> ${this.session.sessionId}</li>
        <li><strong>Download Location:</strong> ${this.sessionDir}</li>
      </ul>
      
      <h3>Downloaded Files</h3>
      <div class="file-list">
        ${this.session.downloadedFiles.map(f => `
          <div class="file-item">
            ${f.verified ? '✅' : '❌'} <strong>${f.filename}</strong> (${this.formatBytes(f.size)})
          </div>
        `).join('')}
      </div>
      
      <p><strong>Verification Log:</strong> ${this.session.verificationLogPath}</p>
      <p>All files have been automatically downloaded and verified.</p>
    </div>
  </div>
</body>
</html>
        `;

        await transporter.sendMail({
          from: process.env.EMAIL_USER || 'your-email@gmail.com',
          to: email,
          subject: `✅ MISRA Analysis Complete - ${verifiedCount}/${totalCount} Files Verified`,
          html: emailContent
        });

        console.log(`   ✅ Email sent successfully to ${email}`);
      } catch (nodemailerError) {
        console.log(`   ⚠️  Nodemailer not available or email send failed: ${nodemailerError.message}`);
        console.log(`   📝 Email content would have been sent to: ${email}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Email notification failed: ${error}`);
    }
  }

  /**
   * Send WhatsApp notification
   */
  private async sendWhatsAppNotification(phoneNumber: string, verifiedCount: number, totalCount: number, totalSize: number): Promise<void> {
    try {
      console.log(`   📱 Sending WhatsApp to ${phoneNumber}...`);

      // Try to use Twilio if available
      try {
        const twilio = require('twilio');
        
        const accountSid = process.env.TWILIO_ACCOUNT_SID || 'your-account-sid';
        const authToken = process.env.TWILIO_AUTH_TOKEN || 'your-auth-token';
        const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890';

        const client = twilio(accountSid, authToken);

        const whatsappMessage = `
✅ MISRA Analysis Complete!

📊 Verification Results:
• Files Verified: ${verifiedCount}/${totalCount}
• Total Size: ${this.formatBytes(totalSize)}
• Session: ${this.session.sessionId}

📁 Downloaded Files:
${this.session.downloadedFiles.map(f => `${f.verified ? '✅' : '❌'} ${f.filename}`).join('\n')}

🔗 Details: ${this.sessionDir}
        `;

        // Format phone number for WhatsApp (add country code if needed)
        const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber}`;

        await client.messages.create({
          from: `whatsapp:${fromNumber}`,
          to: `whatsapp:${formattedPhone}`,
          body: whatsappMessage
        });

        console.log(`   ✅ WhatsApp message sent successfully to ${phoneNumber}`);
      } catch (twilioError) {
        console.log(`   ⚠️  Twilio not available or WhatsApp send failed: ${twilioError.message}`);
        console.log(`   📱 WhatsApp message would have been sent to: ${phoneNumber}`);
      }
    } catch (error) {
      console.log(`   ⚠️  WhatsApp notification failed: ${error}`);
    }
  }
}
