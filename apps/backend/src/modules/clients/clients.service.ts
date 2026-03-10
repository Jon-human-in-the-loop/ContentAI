import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, data: {
    name: string;
    industry?: string;
    description?: string;
    website?: string;
    branding?: {
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
      fontPrimary?: string;
      fontSecondary?: string;
      toneOfVoice?: string;
      styleKeywords?: string[];
      prohibitions?: string[];
      sampleContent?: string;
    };
  }) {
    return this.prisma.client.create({
      data: {
        orgId,
        name: data.name,
        industry: data.industry,
        description: data.description,
        website: data.website,
        branding: data.branding
          ? { create: data.branding }
          : undefined,
      },
      include: { branding: true },
    });
  }

  async findAll(orgId: string) {
    return this.prisma.client.findMany({
      where: { orgId },
      include: {
        branding: true,
        _count: {
          select: {
            contentPieces: true,
            socialAccounts: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, orgId },
      include: {
        branding: true,
        socialAccounts: {
          select: {
            id: true,
            platform: true,
            accountName: true,
            connectedAt: true,
          },
        },
        templates: { where: { isActive: true } },
      },
    });

    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async update(orgId: string, id: string, data: any) {
    const client = await this.prisma.client.findFirst({ where: { id, orgId } });
    if (!client) throw new NotFoundException('Client not found');

    const { branding, ...clientData } = data;

    return this.prisma.client.update({
      where: { id },
      data: {
        ...clientData,
        ...(branding
          ? {
              branding: {
                upsert: {
                  create: branding,
                  update: branding,
                },
              },
            }
          : {}),
      },
      include: { branding: true },
    });
  }

  async delete(orgId: string, id: string) {
    const client = await this.prisma.client.findFirst({ where: { id, orgId } });
    if (!client) throw new NotFoundException('Client not found');

    await this.prisma.client.delete({ where: { id } });
    return { deleted: true };
  }
}
