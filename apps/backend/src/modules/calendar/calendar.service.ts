import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get calendar view for a date range
   */
  async getCalendarView(
    orgId: string,
    startDate: Date,
    endDate: Date,
    clientId?: string,
  ) {
    const pieces = await this.prisma.contentPiece.findMany({
      where: {
        orgId,
        ...(clientId ? { clientId } : {}),
        scheduledAt: { gte: startDate, lte: endDate },
        status: { in: ['SCHEDULED', 'PUBLISHED', 'APPROVED'] },
      },
      include: {
        client: { select: { name: true, logoUrl: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Group by date
    const calendar: Record<string, any[]> = {};
    for (const piece of pieces) {
      const dateKey = piece.scheduledAt!.toISOString().split('T')[0];
      if (!calendar[dateKey]) calendar[dateKey] = [];
      calendar[dateKey].push(piece);
    }

    return calendar;
  }

  /**
   * Schedule a content piece
   */
  async schedulePiece(
    orgId: string,
    pieceId: string,
    scheduledAt: Date,
    platform: string,
    socialAccountId: string,
  ) {
    const piece = await this.prisma.contentPiece.findFirst({
      where: { id: pieceId, orgId, status: 'APPROVED' },
    });

    if (!piece) {
      throw new NotFoundException('Approved content piece not found');
    }

    if (scheduledAt < new Date()) {
      throw new BadRequestException('Cannot schedule in the past');
    }

    // Update piece
    await this.prisma.contentPiece.update({
      where: { id: pieceId },
      data: { scheduledAt, status: 'SCHEDULED', platform: platform as any },
    });

    // Create publish queue entry
    await this.prisma.publishQueue.create({
      data: {
        contentPieceId: pieceId,
        platform: platform as any,
        socialAccountId,
        scheduledAt,
      },
    });

    return { scheduled: true, scheduledAt };
  }

  /**
   * Unschedule a content piece
   */
  async unschedulePiece(orgId: string, pieceId: string) {
    const piece = await this.prisma.contentPiece.findFirst({
      where: { id: pieceId, orgId, status: 'SCHEDULED' },
    });

    if (!piece) throw new NotFoundException('Scheduled piece not found');

    await this.prisma.$transaction([
      this.prisma.contentPiece.update({
        where: { id: pieceId },
        data: { scheduledAt: null, status: 'APPROVED' },
      }),
      this.prisma.publishQueue.deleteMany({
        where: { contentPieceId: pieceId, status: 'QUEUED' },
      }),
    ]);

    return { unscheduled: true };
  }
}
