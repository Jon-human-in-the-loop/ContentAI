import { Controller, Get, Put, Body, Request } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { execSync } from 'child_process';

// Available Claude models — Anthropic official pricing May 2026
// Prices in USD per 1M tokens
export const CLAUDE_MODELS = [
  // ── Haiku (economical) ────────────────────────────────────────────────
  {
    id: 'claude-3-5-haiku-20241022',
    label: 'Claude 3.5 Haiku',
    tier: 'lite',
    description: 'Rápido y económico — ideal para alto volumen',
    inputCost: 0.80, outputCost: 4.00,
  },
  {
    id: 'claude-3-7-haiku-20251101',
    label: 'Claude 3.7 Haiku',
    tier: 'lite',
    description: 'Mejor razonamiento en el modelo más ligero',
    inputCost: 1.00, outputCost: 5.00,
  },

  // ── Sonnet (balanced) ─────────────────────────────────────────────────
  {
    id: 'claude-3-5-sonnet-20240620',
    label: 'Claude 3.5 Sonnet',
    tier: 'premium',
    description: 'Equilibrado — el estándar de la industria',
    inputCost: 3.00, outputCost: 15.00,
  },
  {
    id: 'claude-3-7-sonnet-20260210',
    label: 'Claude 3.7 Sonnet (Mejorado)',
    tier: 'premium',
    description: 'Última versión Sonnet — capacidades de codificación y narrativa superiores',
    inputCost: 3.00, outputCost: 15.00,
  },

  // ── Opus (ultra) ──────────────────────────────────────────────────────
  {
    id: 'claude-4-0-opus-20260401',
    label: 'Claude 4.0 Opus',
    tier: 'ultra',
    description: 'Máxima calidad — para estrategia y contenido de alto impacto',
    inputCost: 5.00, outputCost: 25.00,
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
