import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(orgId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalClients,
      totalPieces,
      monthlyPieces,
      costSummary,
      piecesByStatus,
      piecesByType,
    ] = await Promise.all([
      this.prisma.client.count({ where: { orgId } }),

      this.prisma.contentPiece.count({ where: { orgId } }),

      this.prisma.contentPiece.count({
        where: { orgId, createdAt: { gte: monthStart } },
      }),

      this.prisma.apiUsageLog.aggregate({
        where: { orgId, createdAt: { gte: monthStart } },
        _sum: { cost: true, tokensInput: true, tokensOutput: true },
        _count: true,
      }),

      this.prisma.contentPiece.groupBy({
        by: ['status'],
        where: { orgId },
        _count: true,
      }),

      this.prisma.contentPiece.groupBy({
        by: ['type'],
        where: { orgId, createdAt: { gte: monthStart } },
        _count: true,
      }),
    ]);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { monthlyTokenLimit: true, tokensUsed: true, plan: true },
    });

    return {
      overview: {
        totalClients,
        totalPieces,
        monthlyPieces,
        plan: org?.plan,
      },
      costs: {
        monthlySpend: costSummary._sum.cost || 0,
        totalTokens:
          (costSummary._sum.tokensInput || 0) + (costSummary._sum.tokensOutput || 0),
        apiCalls: costSummary._count,
        tokenBudget: {
          limit: Number(org?.monthlyTokenLimit || 0),
          used: Number(org?.tokensUsed || 0),
          remaining: Number(org?.monthlyTokenLimit || 0) - Number(org?.tokensUsed || 0),
          usagePercent:
            org?.monthlyTokenLimit
              ? Number(((Number(org.tokensUsed) / Number(org.monthlyTokenLimit)) * 100).toFixed(1))
              : 0,
        },
      },
      breakdown: {
        byStatus: piecesByStatus,
        byType: piecesByType,
      },
    };
  }

  async getCostHistory(orgId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyCosts = await this.prisma.$queryRaw`
      SELECT
        DATE(created_at) as date,
        model,
        COUNT(*) as requests,
        SUM(tokens_input) as tokens_input,
        SUM(tokens_output) as tokens_output,
        SUM(cost) as total_cost,
        SUM(CASE WHEN cached THEN 1 ELSE 0 END) as cache_hits
      FROM api_usage_log
      WHERE org_id = ${orgId}::uuid
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at), model
      ORDER BY date DESC
    `;

    return dailyCosts;
  }
}
