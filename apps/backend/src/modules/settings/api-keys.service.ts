import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../common/encryption.service';

export interface SavedApiKey {
  provider: string;
  label: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  async saveKey(orgId: string, provider: string, plainKey: string): Promise<SavedApiKey> {
    const encryptedKey = this.encryption.encrypt(plainKey);
    const label = this.encryption.maskKey(plainKey);

    const result = await this.prisma.orgApiKey.upsert({
      where: { orgId_provider: { orgId, provider } },
      update: { encryptedKey, label, updatedAt: new Date() },
      create: { orgId, provider, encryptedKey, label },
    });

    this.logger.log(`API key saved for org=${orgId} provider=${provider}`);

    return {
      provider: result.provider,
      label: result.label || label,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async getKeys(orgId: string): Promise<SavedApiKey[]> {
    const keys = await this.prisma.orgApiKey.findMany({
      where: { orgId },
      select: { provider: true, label: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return keys.map((k) => ({
      provider: k.provider,
      label: k.label || '••••••••',
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
    }));
  }

  async deleteKey(orgId: string, provider: string): Promise<void> {
    await this.prisma.orgApiKey.deleteMany({
      where: { orgId, provider },
    });
    this.logger.log(`API key deleted for org=${orgId} provider=${provider}`);
  }

  /**
   * Retrieves decrypted key for internal use (e.g., when calling Anthropic API).
   * NEVER expose this to the frontend.
   */
  async getDecryptedKey(orgId: string, provider: string): Promise<string | null> {
    const record = await this.prisma.orgApiKey.findUnique({
      where: { orgId_provider: { orgId, provider } },
    });
    if (!record) return null;
    return this.encryption.decrypt(record.encryptedKey);
  }
}
