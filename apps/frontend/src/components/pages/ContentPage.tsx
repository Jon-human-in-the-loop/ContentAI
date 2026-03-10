import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/primitives';
import { ContentPiece } from '@/data/mock';
import { api } from '@/lib/api';

const statusColors: Record<string, string> = {
  GENERATING: 'bg-amber-100 text-amber-700',
  DRAFT: 'bg-slate-100 text-slate-600',
  APPROVED: 'bg-blue-100 text-blue-700',
  SCHEDULED: 'bg-violet-100 text-violet-700',
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-600',
};

export function ContentPage() {
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      try {
        const data = await api('/content/requests');
        const extractedPieces: ContentPiece[] = (data || []).flatMap((req: any) =>
          (req.pieces || []).map((p: any) => ({
            id: p.id,
            clientId: req.clientId,
            clientName: req.client?.name || 'Cliente',
            type: p.type || 'POST',
            platform: 'INSTAGRAM',
            status: p.status || 'DRAFT',
            caption: p.caption || '',
            hook: p.hook || '',
            cta: p.cta || '',
            script: p.script || '',
            hashtags: p.hashtags || [],
            generationCost: 0.003,
            modelUsed: 'claude-3-5-sonnet',
            createdAt: p.createdAt || new Date().toISOString(),
          }))
        );
        setPieces(extractedPieces);
      } catch (err) {
        console.error('Failed to load content:', err);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, []);

  const filtered = pieces.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (search && !p.caption.toLowerCase().includes(search.toLowerCase()) &&
        !p.clientName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusCounts = pieces.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Contenido</h1>
          <p className="text-muted-foreground text-sm mt-1">{pieces.length} piezas totales</p>
        </div>
      </div>

      {/* Status chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setStatusFilter('all')}
        >
          Todas ({pieces.length})
        </Button>
        {Object.entries(statusCounts).map(([status, count]) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
          >
            {status} ({count})
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar por contenido o cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-3 h-6">Todos</TabsTrigger>
            <TabsTrigger value="POST" className="text-xs px-3 h-6">▦ Posts</TabsTrigger>
            <TabsTrigger value="REEL" className="text-xs px-3 h-6">▶ Reels</TabsTrigger>
            <TabsTrigger value="STORY" className="text-xs px-3 h-6">◯ Stories</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map((piece) => (
          <Card key={piece.id} className="border-0 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] font-medium">
                    {piece.type === 'POST' ? '▦' : piece.type === 'REEL' ? '▶' : '◯'} {piece.type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{piece.platform}</span>
                </div>
                <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${statusColors[piece.status]}`}>
                  {piece.status}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold">{piece.clientName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(piece.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-foreground/80 mb-3">
                {piece.caption || <span className="italic text-muted-foreground">Generando...</span>}
              </p>

              {piece.hook && (
                <div className="mb-2">
                  <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Hook:</span>
                  <p className="text-xs text-emerald-600 font-medium">{piece.hook}</p>
                </div>
              )}

              {piece.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {piece.hashtags.slice(0, 4).map((h) => (
                    <span key={h} className="text-[10px] text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded">#{h}</span>
                  ))}
                  {piece.hashtags.length > 4 && (
                    <span className="text-[10px] text-muted-foreground">+{piece.hashtags.length - 4}</span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground">
                    {piece.modelUsed ? piece.modelUsed.includes('sonnet') ? '⚡ Sonnet' : '💡 Haiku' : '...'}
                  </span>
                  {piece.generationCost > 0 && (
                    <span className="text-[10px] text-muted-foreground">${piece.generationCost.toFixed(4)}</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {piece.status === 'DRAFT' && (
                    <>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2">Editar</Button>
                      <Button size="sm" className="h-6 text-[10px] px-2 bg-emerald-500 text-white hover:bg-emerald-600">Aprobar</Button>
                    </>
                  )}
                  {piece.status === 'APPROVED' && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2">Programar</Button>
                  )}
                  {piece.scheduledAt && (
                    <span className="text-[10px] text-violet-600 font-medium">
                      📅 {new Date(piece.scheduledAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No se encontraron piezas con esos filtros</p>
        </div>
      )}
    </div>
  );
}
