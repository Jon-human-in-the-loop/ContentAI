import { Controller, Get, Put, Body, Request } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { execSync } from 'child_process';

// Available Claude models — Anthropic official lineup May 2026
export const CLAUDE_MODELS = [
  // ── Opus (ultra) ──────────────────────────────────────────────────────
  {
    id: 'claude-opus-4-7',
    label: 'Claude Opus 4.7',
    tier: 'ultra',
    description: 'El modelo más avanzado. Razonamiento superior, codificación y multimodal.',
    inputCost: 5.00, outputCost: 25.00,
  },
  {
    id: 'claude-opus-4',
    label: 'Claude Opus 4',
    tier: 'ultra',
    description: 'Versión anterior de Opus. Muy capaz para tareas exigentes.',
    inputCost: 5.00, outputCost: 25.00,
  },

  // ── Sonnet (premium) ──────────────────────────────────────────────────
  {
    id: 'claude-sonnet-4',
    label: 'Claude Sonnet 4',
    tier: 'premium',
    description: 'Equilibrio ideal entre inteligencia y velocidad a costo razonable.',
    inputCost: 3.00, outputCost: 15.00,
  },
  {
    id: 'claude-sonnet-3-7',
    label: 'Claude Sonnet 3.7',
    tier: 'premium',
    description: 'Versión anterior de Sonnet. Buen rendimiento general y rentable.',
    inputCost: 3.00, outputCost: 15.00,
  },

  // ── Haiku (lite) ──────────────────────────────────────────────────────
  {
    id: 'claude-haiku-3-5',
    label: 'Claude Haiku 3.5',
    tier: 'lite',
    description: 'Modelo más rápido y compacto para respuestas instantáneas.',
    inputCost: 0.80, outputCost: 4.00,
  },
  {
    id: 'claude-haiku-3',
    label: 'Claude Haiku 3',
    tier: 'lite',
    description: 'Versión anterior de Haiku. El modelo más económico.',
    inputCost: 0.25, outputCost: 1.25,
  },
];


@Controller('settings/organization')
export class OrganizationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('current')
  async getCurrent(@Request() req) {
    const orgId = req.user.orgId;
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        plan: true,
        tokensUsed: true,
        monthlyTokenLimit: true,
      },
    });

    if (!org) {
      return {
        id: orgId,
        name: 'Mi Agencia',
        plan: 'STARTER',
        tokensUsed: 0,
        monthlyTokenLimit: 1000000,
      };
    }

    return org;
  }

  @Put('current')
  async updateCurrent(@Request() req, @Body() body: { name: string }) {
    if (!body.name?.trim()) return { error: 'Name is required' };
    const orgId = req.user.orgId;

    return this.prisma.organization.update({
      where: { id: orgId },
      data: { name: body.name },
      select: { id: true, name: true, plan: true },
    });
  }

  /**
   * GET /api/v1/settings/organization/ai-model
   * Returns the current preferred model and the full list of available models
   */
  @Get('ai-model')
  async getAiModel(@Request() req) {
    const orgId = req.user.orgId;
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { preferredModel: true } as any,
    });

    return {
      current: (org as any)?.preferredModel || 'claude-3-5-sonnet-20240620',
      models: CLAUDE_MODELS,
    };
  }

  /**
   * PUT /api/v1/settings/organization/ai-model
   * Updates the preferred Claude model for this organization
   */
  @Put('ai-model')
  async setAiModel(@Request() req, @Body() body: { modelId: string }) {
    const orgId = req.user.orgId;
    const valid = CLAUDE_MODELS.find(m => m.id === body.modelId);
    if (!valid) {
      return { error: 'Modelo inválido', available: CLAUDE_MODELS.map(m => m.id) };
    }

    try {
      await this.prisma.organization.update({
        where: { id: orgId },
        data: { preferredModel: body.modelId } as any,
      });

      return { success: true, model: valid };
    } catch (err: any) {
      return { error: 'Error DB Prisma: ' + err.message };
    }
  }

  @Get('force-migration')
  forceMigration() {
    try {
      const result = execSync('npx prisma migrate deploy', { encoding: 'utf-8' });
      return { success: true, output: result };
    } catch (err: any) {
      return { 
        success: false, 
        error: err.message, 
        stderr: err.stderr?.toString(),
        stdout: err.stdout?.toString()
      };
    }
  }
}
