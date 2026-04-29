import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { Logger } from './logger';

const logger = new Logger('ImapProvider');

export class ImapProvider {
  private email: string;
  private password: string;
  private client: ImapFlow | null = null;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  async fetchOtp(maxAttempts: number = 20, retryDelayMs: number = 3000): Promise<string> {
    logger.info(`🔍 Fetching OTP for ${this.email}...`);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        logger.info(`⏳ Attempt ${attempt + 1}/${maxAttempts}`);

        const otp = await this.searchAndExtractOtp();

        if (otp) {
          logger.info(`✅ OTP found: ${otp}`);
          return otp;
        }

        if (attempt < maxAttempts - 1) {
          logger.info(`⏸️ Waiting ${retryDelayMs}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      } catch (error) {
        logger.warn(`⚠️ Attempt ${attempt + 1} failed: ${error}`);

        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    throw new Error(`❌ OTP not found after ${maxAttempts} attempts`);
  }

  private async searchAndExtractOtp(): Promise<string | null> {
    try {
      await this.connect();

      if (!this.client) {
        throw new Error('IMAP client not connected');
      }

      // Try INBOX first (most reliable for new emails)
      const mailboxes = ['INBOX', '[Gmail]/All Mail'];

      for (const mailbox of mailboxes) {
        logger.info(`📁 Searching mailbox: ${mailbox}`);

        try {
          await this.client.mailboxOpen(mailbox);

          // Search for UNSEEN messages (unread)
          const messages = await this.client.search({ seen: false }, { uid: true });

          if (!messages || messages.length === 0) {
            logger.info(`📭 No unread messages in ${mailbox}`);
            continue;
          }

          logger.info(`📧 Found ${messages.length} unread message(s)`);

          // Get latest 30 messages
          const latestMessages = (messages as number[]).slice(-30);
          logger.info(`🔎 Processing latest ${latestMessages.length} messages`);

          // Process in reverse (newest first)
          for (const uid of latestMessages.reverse()) {
            try {
              const otp = await this.extractOtpFromMessage(uid);

              if (otp) {
                // Mark as read
                await this.client.messageFlagsAdd(String(uid), ['\\Seen']);
                logger.info(`✅ Message marked as read`);
                return otp;
              }
            } catch (error) {
              logger.warn(`⚠️ Error processing message ${uid}: ${error}`);
            }
          }
        } catch (error) {
          logger.warn(`⚠️ Error accessing mailbox ${mailbox}: ${error}`);
        }
      }

      return null;
    } finally {
      await this.disconnect();
    }
  }

  private async extractOtpFromMessage(uid: number): Promise<string | null> {
    if (!this.client) {
      throw new Error('IMAP client not connected');
    }

    try {
      logger.info(`📨 Fetching message ${uid}...`);

      const message = await this.client.fetchOne(String(uid), { source: true });

      if (!message || !message.source) {
        logger.warn(`⚠️ Message ${uid} has no source`);
        return null;
      }

      // Parse email using mailparser to handle multipart bodies
      logger.info(`🔄 Parsing email with mailparser...`);
      const parsed = await simpleParser(message.source);

      // Combine text and HTML content
      const emailText = parsed.text || '';
      const emailHtml = parsed.html || '';
      const combinedContent = `${emailText}\n${emailHtml}`;

      logger.info(`📬 From: ${parsed.from?.text || 'unknown'}`);
      logger.info(`📋 Subject: ${parsed.subject || 'no subject'}`);

      // Extract OTP
      const otp = this.extractOtpFromContent(combinedContent);

      if (otp) {
        logger.info(`🔑 OTP extracted: ${otp}`);
        return otp;
      }

      logger.info(`❌ No OTP pattern matched in message ${uid}`);
      return null;
    } catch (error) {
      logger.warn(`⚠️ Error extracting OTP from message ${uid}: ${error}`);
      return null;
    }
  }

  private extractOtpFromContent(content: string): string | null {
    // OTP patterns to try (ordered by specificity)
    const patterns = [
      { name: 'your-code', regex: /your\s+code[:\s]+(\d{6})/i },
      { name: 'otp-code', regex: /otp[:\s]+(\d{6})/i },
      { name: 'verification-code', regex: /verification\s+code[:\s]+(\d{6})/i },
      { name: 'code-label', regex: /code[:\s]+(\d{6})/i },
      { name: 'otp-in-brackets', regex: /\[(\d{6})\]/ },
      { name: 'otp-in-parens', regex: /\((\d{6})\)/ },
      { name: '6-digit-standalone', regex: /\b(\d{6})\b/ },
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern.regex);
      if (match && match[1]) {
        logger.info(`✅ OTP matched using pattern: ${pattern.name}`);
        return match[1];
      }
    }

    logger.warn(`❌ No OTP pattern matched`);
    return null;
  }

  private async connect(): Promise<void> {
    if (this.client) {
      logger.info('🔌 IMAP already connected');
      return;
    }

    try {
      logger.info('🔌 Connecting to Gmail IMAP...');

      this.client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: {
          user: this.email,
          pass: this.password,
        },
      });

      await this.client.connect();
      logger.info('✅ IMAP connected successfully');
    } catch (error) {
      logger.error(`❌ IMAP connection failed: ${error}`);
      throw error;
    }
  }

  private async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.logout();
        logger.info('✅ IMAP disconnected');
      } catch (error) {
        logger.warn(`⚠️ Error disconnecting IMAP: ${error}`);
      }
      this.client = null;
    }
  }
}
