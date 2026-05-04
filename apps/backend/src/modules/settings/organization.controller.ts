import { Controller, Get, Put, Body, Request } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { execSync } from 'child_process';

// Available Claude models — Final May 2026 lineup
export const CLAUDE_MODELS = [
  // ── Experimental / Mythic ─────────────────────────────────────────────
  {
    id: 'claude-mythos-preview',
    label: 'Claude Mythos Preview',
    tier: 'ultra',
    description: 'El modelo más potente y experimental. Capacidades de razonamiento extremas (Thinking 1M).',
    inputCost: 15.00, outputCost: 75.00, // Estimado para modelo experimental superior
  },

  // ── Opus (ultra) ──────────────────────────────────────────────────────
  {
    id: 'claude-opus-4-7',
    label: 'Claude Opus 4.7',
    tier: 'ultra',
    description: 'Mejora significativa en ingeniería de software y tareas complejas.',
    inputCost: 5.00, outputCost: 25.00,
  },
  {
    id: 'claude-opus-4.6',
    label: 'Claude Opus 4.6',
    tier: 'ultra',
    description: 'Ventana de 1M tokens. Excelente para codificación y agentes.',
    inputCost: 5.00, outputCost: 25.00,
  },

  // ── Sonnet (premium) ──────────────────────────────────────────────────
  {
    id: 'claude-sonnet-4.6',
    label: 'Claude Sonnet 4.6',
    tier: 'premium',
    description: 'Equilibrio extraordinario. Supera a Opus 4.5 en muchas tareas.',
    inputCost: 3.00, outputCost: 15.00,
  },
  {
    id: 'claude-sonnet-4.5',
    label: 'Claude Sonnet 4.5',
    tier: 'premium',
    description: 'Versión estable para aplicaciones de producción.',
    inputCost: 3.00, outputCost: 15.00,
  },
  {
    id: 'claude-3-7-sonnet',
    label: 'Claude 3.7 Sonnet',
    tier: 'premium',
    description: 'Modelo con capacidades de razonamiento (thinking) integradas.',
    inputCost: 3.00, outputCost: 15.00,
  },

  // ── Haiku (lite) ──────────────────────────────────────────────────────
  {
    id: 'claude-haiku-4.5',
    label: 'Claude Haiku 4.5',
    tier: 'lite',
    description: 'El modelo más rápido y económico de la serie 4.',
    inputCost: 1.00, outputCost: 5.00,
  },
  {
    id: 'claude-3-5-haiku',
    label: 'Claude 3.5 Haiku',
    tier: 'lite',
    description: 'Extremadamente rápido y eficiente para baja latencia.',
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
