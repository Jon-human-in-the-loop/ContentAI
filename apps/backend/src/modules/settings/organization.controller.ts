import { Controller, Get, Put, Body } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

// TODO: Replace with authenticated user's org JWT
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

@Controller('settings/organization')
export class OrganizationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('current')
  async getCurrent() {
    const org = await this.prisma.organization.findUnique({
      where: { id: DEFAULT_ORG_ID },
      select: {
        id: true,
        name: true,
        plan: true,
        tokensUsed: true,
        monthlyTokenLimit: true,
      },
    });

    if (!org) {
      // Default fallback if not seeded
      return {
        id: DEFAULT_ORG_ID,
        name: 'Mi Agencia',
        plan: 'STARTER',
        tokensUsed: 0,
        monthlyTokenLimit: 1000000,
      };
    }

    return org;
  }

  @Put('current')
  async updateCurrent(@Body() body: { name: string }) {
    if (!body.name?.trim()) return { error: 'Name is required' };
    
    return this.prisma.organization.update({
      where: { id: DEFAULT_ORG_ID },
      data: { name: body.name },
      select: {
        id: true,
        name: true,
        plan: true,
      },
    });
  }
}
