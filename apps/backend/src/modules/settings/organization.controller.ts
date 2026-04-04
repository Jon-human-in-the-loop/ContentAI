import { Controller, Get, Put, Body } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

// TODO: Replace with authenticated user's org JWT
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

// Available Claude models with metadata
export const CLAUDE_MODELS = [
  { id: 'claude-haiku-4-5',  label: 'Claude Haiku 4.5',  tier: 'lite',    description: 'Rápido y económico — ideal para alto volumen', inputCost: 0.80,  outputCost: 4.00  },
  { id: 'claude-sonnet-4',   label: 'Claude Sonnet 4',   tier: 'premium', description: 'Equilibrado — calidad y velocidad óptimas',      inputCost: 3.00,  outputCost: 15.00 },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', tier: 'premium', description: 'Mayor capacidad creativa y coherencia',             inputCost: 3.00,  outputCost: 15.00 },
  { id: 'claude-opus-4',     label: 'Claude Opus 4',     tier: 'ultra',   description: 'Máxima calidad — copywriting de alto impacto',     inputCost: 15.00, outputCost: 75.00 },
];

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
      select: { id: true, name: true, plan: true },
    });
  }

  /**
   * GET /api/v1/settings/organization/ai-model
   * Returns the current preferred model and the full list of available models
   */
  @Get('ai-model')
  async getAiModel() {
    const org = await this.prisma.organization.findUnique({
      where: { id: DEFAULT_ORG_ID },
      select: { preferredModel: true } as any,
    });

    return {
      current: (org as any)?.preferredModel || 'claude-haiku-4-5',
      models: CLAUDE_MODELS,
    };
  }

  /**
   * PUT /api/v1/settings/organization/ai-model
   * Updates the preferred Claude model for this organization
   */
  @Put('ai-model')
  async setAiModel(@Body() body: { modelId: string }) {
    const valid = CLAUDE_MODELS.find(m => m.id === body.modelId);
    if (!valid) {
      return { error: 'Modelo inválido', available: CLAUDE_MODELS.map(m => m.id) };
    }

    await this.prisma.organization.update({
      where: { id: DEFAULT_ORG_ID },
      data: { preferredModel: body.modelId } as any,
    });

    return { success: true, model: valid };
  }
}
