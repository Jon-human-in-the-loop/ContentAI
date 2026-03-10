import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CostTrackerService {
  private readonly logger = new Logger(CostTrackerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log an API usage event
   */
  async logUsage(params: {
    orgId: string;
    model: string;
    tokensInput: number;
    tokensOutput: number;
    cost: number;
    taskType: string;
    contentPieceId?: string;
    cached?: boolean;
  }): Promise<void> {
    await this.prisma.apiUsageLog.create({
      data: {
        orgId: params.orgId,
        model: params.model,
        tokensInput: params.tokensInput,
        tokensOutput: params.tokensOutput,
        cost: params.cost,
        taskType: params.taskType,
        contentPieceId: params.contentPieceId,
        cached: params.cached || false,
      },
    });

    // Update org token counter
    await this.prisma.organization.update({
      where: { id: params.orgId },
      data: {
        tokensUsed: {
          increment: params.tokensInput + params.tokensOutput,
        },
      },
    });
  }

  /**
   * Get cost summary for an organization
   */
  async getOrgCostSummary(orgId: string, startDate: Date, endDate: Date) {
    const usage = await this.prisma.apiUsageLog.groupBy({
      by: ['model', 'taskType'],
      where: {
        orgId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: {
        tokensInput: true,
        tokensOutput: true,
        cost: true,
      },
      _count: true,
    });

    const cacheHits = await this.prisma.apiUsageLog.count({
      where: { orgId, cached: true, createdAt: { gte: startDate, lte: endDate } },
    });

    const totalRequests = await this.prisma.apiUsageLog.count({
      where: { orgId, createdAt: { gte: startDate, lte: endDate } },
    });

    return {
      byModel: usage,
      cacheHitRate: totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0,
      totalRequests,
      period: { start: startDate, end: endDate },
    };
  }
}
