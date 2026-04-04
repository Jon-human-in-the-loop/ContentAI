import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { CreateContentRequestDto, UpdateContentPieceDto } from './dto/content.dto';
import { QUEUES } from '../../common/constants';

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUES.CONTENT_GENERATE) private generateQueue: Queue,
  ) {}

  /**
   * Create a content generation request and enqueue jobs
   */
  async createRequest(orgId: string, userId: string, dto: CreateContentRequestDto) {
    // Verify client belongs to org
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, orgId },
      include: { branding: true },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Check token budget
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    if (org.tokensUsed >= org.monthlyTokenLimit) {
      throw new ForbiddenException('Monthly token limit exceeded');
    }

    // Calculate total pieces
    const totalPieces = Object.values(dto.contentTypes).reduce(
      (sum: number, count: number) => sum + (count || 0),
      0,
    );

    // Create the request
    const request = await this.prisma.contentRequest.create({
      data: {
        orgId,
        clientId: dto.clientId,
        userId,
        brief: dto.brief,
        contentTypes: dto.contentTypes as any,
        platforms: (dto.platforms as any) || [],
        templateIds: dto.templateIds || [],
        status: 'PROCESSING',
        totalPieces,
      },
    });

    // Split into individual generation jobs
    const jobs: any[] = [];
    for (const [type, count] of Object.entries(dto.contentTypes)) {
      for (let i = 0; i < (count || 0); i++) {
        jobs.push({
          name: `generate:${type.toLowerCase()}`,
          data: {
            requestId: request.id,
            orgId,
            clientId: dto.clientId,
            type,
            brief: dto.brief,
            platforms: dto.platforms,
            index: i,
            brandProfile: client.branding,
            clientName: client.name,
            industry: client.industry,
          },
          opts: {
            priority: this.getPriority(org.plan),
            jobId: `${request.id}:${type}:${i}`,
          },
        });
      }
    }

    // Enqueue all jobs
    await this.generateQueue.addBulk(jobs);

    return {
      id: request.id,
      status: 'PROCESSING',
      totalPieces,
      message: `${totalPieces} content pieces queued for generation`,
    };
  }

  /**
   * Get all content requests for an org, optionally filtered by client
   */
  async getRequests(orgId: string, clientId?: string) {
    return this.prisma.contentRequest.findMany({
      where: { orgId, ...(clientId ? { clientId } : {}) },
      include: {
        client: { select: { name: true, logoUrl: true } },
        pieces: {
          select: {
            id: true,
            type: true,
            status: true,
            caption: true,
            hook: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete a content request (useful for cleaning up stuck requests)
   */
  async deleteRequest(orgId: string, requestId: string) {
    const request = await this.prisma.contentRequest.findFirst({
      where: { id: requestId, orgId },
    });
    if (!request) throw new NotFoundException('Request not found');

    return this.prisma.contentRequest.delete({
      where: { id: requestId },
    });
  }

  /**
   * Get a specific content piece with full details
   */
  async getPiece(orgId: string, pieceId: string) {
    const piece = await this.prisma.contentPiece.findFirst({
      where: { id: pieceId, orgId },
      include: {
        client: { include: { branding: true } },
        request: { select: { brief: true } },
        versions: true,
      },
    });

    if (!piece) throw new NotFoundException('Content piece not found');
    return piece;
  }

  /**
   * Update a content piece (edit caption, hashtags, etc.)
   */
  async updatePiece(orgId: string, pieceId: string, dto: UpdateContentPieceDto) {
    const piece = await this.prisma.contentPiece.findFirst({
      where: { id: pieceId, orgId },
    });
    if (!piece) throw new NotFoundException('Content piece not found');

    return this.prisma.contentPiece.update({
      where: { id: pieceId },
      data: { ...dto, updatedAt: new Date() },
    });
  }

  /**
   * Approve a content piece
   */
  async approvePiece(orgId: string, pieceId: string) {
    return this.updatePieceStatus(orgId, pieceId, 'APPROVED');
  }

  /**
   * Reject a content piece
   */
  async rejectPiece(orgId: string, pieceId: string) {
    return this.updatePieceStatus(orgId, pieceId, 'REJECTED');
  }

  private async updatePieceStatus(orgId: string, pieceId: string, status: string) {
    const piece = await this.prisma.contentPiece.findFirst({
      where: { id: pieceId, orgId },
    });
    if (!piece) throw new NotFoundException('Content piece not found');

    return this.prisma.contentPiece.update({
      where: { id: pieceId },
      data: { status: status as any },
    });
  }

  /**
   * Delete a content piece permanently
   */
  async deletePiece(orgId: string, pieceId: string) {
    const piece = await this.prisma.contentPiece.findFirst({
      where: { id: pieceId, orgId },
    });
    if (!piece) throw new NotFoundException('Content piece not found');

    await this.prisma.contentPiece.delete({ where: { id: pieceId } });
    return { success: true, id: pieceId };
  }


  private getPriority(plan: string): number {
    switch (plan) {
      case 'ENTERPRISE': return 1;
      case 'PRO': return 5;
      default: return 10;
    }
  }
}
