import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotebookService {
  constructor(private prisma: PrismaService) {}

  async createEntry(orgId: string, clientId: string, data: {
    title: string;
    content: string;
    category?: string;
  }) {
    // Verify client belongs to org
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, orgId },
    });
    if (!client) throw new NotFoundException('Client not found');

    return this.prisma.brandNotebookEntry.create({
      data: {
        clientId,
        orgId,
        title: data.title,
        content: data.content,
        category: data.category || 'general',
      },
    });
  }

  async getEntries(orgId: string, clientId: string, category?: string) {
    return this.prisma.brandNotebookEntry.findMany({
      where: {
        clientId,
        orgId,
        ...(category ? { category } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateEntry(orgId: string, entryId: string, data: {
    title?: string;
    content?: string;
    category?: string;
  }) {
    const entry = await this.prisma.brandNotebookEntry.findFirst({
      where: { id: entryId, orgId },
    });
    if (!entry) throw new NotFoundException('Notebook entry not found');

    return this.prisma.brandNotebookEntry.update({
      where: { id: entryId },
      data,
    });
  }

  async deleteEntry(orgId: string, entryId: string) {
    const entry = await this.prisma.brandNotebookEntry.findFirst({
      where: { id: entryId, orgId },
    });
    if (!entry) throw new NotFoundException('Notebook entry not found');

    await this.prisma.brandNotebookEntry.delete({ where: { id: entryId } });
    return { success: true };
  }

  /**
   * Build a condensed context string from all notebook entries for a client.
   * Used to inject brand knowledge into AI generation prompts.
   */
  async buildContext(clientId: string, maxChars = 3000): Promise<string> {
    const entries = await this.prisma.brandNotebookEntry.findMany({
      where: { clientId },
      orderBy: [
        { category: 'asc' },
        { updatedAt: 'desc' },
      ],
    });

    if (entries.length === 0) return '';

    // Group by category and format
    const grouped: Record<string, string[]> = {};
    for (const entry of entries) {
      if (!grouped[entry.category]) grouped[entry.category] = [];
      grouped[entry.category].push(`${entry.title}: ${entry.content}`);
    }

    const categoryLabels: Record<string, string> = {
      brand_voice: 'Brand Voice & Personality',
      audience: 'Target Audience',
      competitors: 'Competitive Landscape',
      guidelines: 'Brand Guidelines',
      reference: 'Reference Content',
      general: 'Additional Notes',
    };

    const sections: string[] = [];
    for (const [category, items] of Object.entries(grouped)) {
      const label = categoryLabels[category] || category;
      sections.push(`[${label}]\n${items.join('\n')}`);
    }

    let context = sections.join('\n\n');

    // Truncate if needed, keeping complete sentences
    if (context.length > maxChars) {
      context = context.substring(0, maxChars);
      const lastSentence = context.lastIndexOf('.');
      if (lastSentence > maxChars * 0.7) {
        context = context.substring(0, lastSentence + 1);
      }
      context += '\n[...truncated]';
    }

    return context;
  }
}
