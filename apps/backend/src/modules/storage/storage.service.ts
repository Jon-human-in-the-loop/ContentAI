import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { PrismaService } from '../../database/prisma.service';
import { randomUUID } from 'crypto';

export interface UploadResult {
  id: string;
  s3Key: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const endpoint = this.config.get('S3_ENDPOINT', '');
    const region = this.config.get('S3_REGION', 'us-east-1');
    this.bucket = this.config.get('S3_BUCKET', 'contentai-media');
    this.publicUrl = this.config.get('S3_PUBLIC_URL', '');

    this.s3 = new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      credentials: {
        accessKeyId: this.config.get('S3_ACCESS_KEY', ''),
        secretAccessKey: this.config.get('S3_SECRET_KEY', ''),
      },
    });
  }

  private isConfigured(): boolean {
    return !!(
      this.config.get('S3_ACCESS_KEY') &&
      this.config.get('S3_SECRET_KEY')
    );
  }

  /**
   * Upload a base64-encoded file to S3 and create a MediaAsset record
   */
  async uploadBase64(params: {
    orgId: string;
    clientId?: string;
    contentPieceId?: string;
    base64: string;
    mimeType: string;
    source?: string;
    metadata?: Record<string, any>;
  }): Promise<UploadResult | null> {
    if (!this.isConfigured()) {
      this.logger.warn('S3 not configured, skipping upload');
      return null;
    }

    const ext = this.mimeToExt(params.mimeType);
    const id = randomUUID();
    const s3Key = `${params.orgId}/${params.clientId || 'general'}/${id}.${ext}`;
    const buffer = Buffer.from(params.base64, 'base64');

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
          Body: buffer,
          ContentType: params.mimeType,
        }),
      );

      const url = this.publicUrl
        ? `${this.publicUrl}/${s3Key}`
        : `/${s3Key}`;

      const asset = await this.prisma.mediaAsset.create({
        data: {
          id,
          orgId: params.orgId,
          clientId: params.clientId || null,
          contentPieceId: params.contentPieceId || null,
          fileName: `${id}.${ext}`,
          mimeType: params.mimeType,
          sizeBytes: buffer.length,
          s3Key,
          url,
          source: params.source || 'upload',
          metadata: params.metadata || undefined,
        },
      });

      this.logger.log(`Uploaded ${s3Key} (${buffer.length} bytes)`);

      return {
        id: asset.id,
        s3Key,
        url,
        mimeType: params.mimeType,
        sizeBytes: buffer.length,
      };
    } catch (error) {
      this.logger.error('S3 upload failed:', error);
      return null;
    }
  }

  /**
   * Get a file from S3 as a buffer
   */
  async getFile(s3Key: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    if (!this.isConfigured()) return null;

    try {
      const result = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: s3Key }),
      );

      const chunks: Uint8Array[] = [];
      for await (const chunk of result.Body as any) {
        chunks.push(chunk);
      }

      return {
        buffer: Buffer.concat(chunks),
        mimeType: result.ContentType || 'application/octet-stream',
      };
    } catch (error) {
      this.logger.error(`Failed to get ${s3Key}:`, error);
      return null;
    }
  }

  /**
   * Delete a file from S3 and its MediaAsset record
   */
  async deleteAsset(orgId: string, assetId: string): Promise<boolean> {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id: assetId, orgId },
    });
    if (!asset) return false;

    try {
      if (this.isConfigured()) {
        await this.s3.send(
          new DeleteObjectCommand({ Bucket: this.bucket, Key: asset.s3Key }),
        );
      }
      await this.prisma.mediaAsset.delete({ where: { id: assetId } });
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete asset ${assetId}:`, error);
      return false;
    }
  }

  /**
   * List media assets for a content piece
   */
  async getAssetsForPiece(orgId: string, contentPieceId: string) {
    return this.prisma.mediaAsset.findMany({
      where: { orgId, contentPieceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List media assets for a client
   */
  async getAssetsForClient(orgId: string, clientId: string) {
    return this.prisma.mediaAsset.findMany({
      where: { orgId, clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private mimeToExt(mimeType: string): string {
    const map: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'video/mp4': 'mp4',
      'application/pdf': 'pdf',
    };
    return map[mimeType] || 'bin';
  }
}
