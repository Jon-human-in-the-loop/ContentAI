import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private config: ConfigService) {
    const hexKey = this.config.get<string>('ENCRYPTION_KEY');
    if (!hexKey || hexKey.length !== 64) {
      this.logger.warn(
        'ENCRYPTION_KEY not set or invalid (must be 64 hex chars / 32 bytes). ' +
        'Generating a temporary key. THIS IS NOT SAFE FOR PRODUCTION.',
      );
      this.key = randomBytes(32);
    } else {
      this.key = Buffer.from(hexKey, 'hex');
    }
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   * Returns a string in format: iv:authTag:ciphertext (all base64)
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted,
    ].join(':');
  }

  /**
   * Decrypts a string encrypted by this service.
   * Expected format: iv:authTag:ciphertext (all base64)
   */
  decrypt(encryptedValue: string): string {
    const [ivB64, authTagB64, ciphertext] = encryptedValue.split(':');

    if (!ivB64 || !authTagB64 || !ciphertext) {
      throw new Error('Invalid encrypted value format');
    }

    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Returns masked version of a key for display purposes.
   * Example: "sk-ant-abc123xyz" → "sk-ant-••••••xyz"
   */
  maskKey(plaintext: string): string {
    if (plaintext.length <= 8) return '••••••••';
    const prefix = plaintext.slice(0, 6);
    const suffix = plaintext.slice(-4);
    return `${prefix}${'•'.repeat(Math.max(plaintext.length - 10, 4))}${suffix}`;
  }
}
