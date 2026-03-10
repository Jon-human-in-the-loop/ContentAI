import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';
import { Textarea } from '@/components/ui/primitives';
import { Label } from '@/components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/primitives';
import { Slider } from '@/components/ui/primitives';
import { Progress } from '@/components/ui/primitives';
import { mockPieces, ContentPiece } from '@/data/mock';
import { api } from '@/lib/api';

const statusColors: Record<string, string> = {
  GENERATING: 'bg-amber-100 text-amber-700',
  DRAFT: 'bg-slate-100 text-slate-600',
  APPROVED: 'bg-blue-100 text-blue-700',
  SCHEDULED: 'bg-violet-100 text-violet-700',
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-600',
};

export function GeneratePage() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [brief, setBrief] = useState('');
  const [posts, setPosts] = useState([3]);
  const [reels, setReels] = useState([1]);
  const [stories, setStories] = useState([2]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ContentPiece[]>([]);
  const [expandedPiece, setExpandedPiece] = useState<string | null>(null);

  useEffect(() => {
    async function loadClients() {
      try {
        const data = await api('/clients');
        setClients(data || []);
      } catch (err) {
        console.error('Failed to load clients', err);
      }
    }
    loadClients();
  }, []);

  const totalPieces = posts[0] + reels[0] + stories[0];

  const handleGenerate = () => {
    if (!selectedClient || !brief.trim()) return;
    setGenerating(true);
    setProgress(0);
    setResults([]);

    // Simulate generation progress
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setGenerating(false);
          setResults(mockPieces.slice(0, totalPieces));
          return 100;
        }
        return p + Math.random() * 15 + 5;
      });
    }, 600);
  };

  const client = clients.find((c) => c.id === selectedClient);

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Generar Contenido</h1>
        <p className="text-muted-foreground text-sm mt-1">Creá contenido con IA para tus clientes</p>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Input form */}
        <div className="col-span-2 space-y-5">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 space-y-5">
              {/* Client selector */}
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Cliente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Seleccioná un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ background: c.primaryColor }} />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Brief */}
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Brief / Prompt</Label>
                <Textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Describí qué contenido querés generar. Ej: Campaña de lanzamiento del nuevo menú de primavera, enfocado en ingredientes locales y platos frescos..."
                  className="mt-1.5 min-h-[120px]"
                />
              </div>

              {/* Quantity selectors */}
              <div className="space-y-4 pt-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Cantidad por tipo</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">▦</span>
                    <span className="text-sm font-medium">Posts</span>
                  </div>
                  <div className="flex items-center gap-3 w-40">
                    <Slider value={posts} onValueChange={setPosts} max={10} step={1} className="flex-1" />
                    <span className="text-sm font-bold w-6 text-right">{posts[0]}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">▶</span>
                    <span className="text-sm font-medium">Reels</span>
                  </div>
                  <div className="flex items-center gap-3 w-40">
                    <Slider value={reels} onValueChange={setReels} max={5} step={1} className="flex-1" />
                    <span className="text-sm font-bold w-6 text-right">{reels[0]}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">◯</span>
                    <span className="text-sm font-medium">Stories</span>
                  </div>
                  <div className="flex items-center gap-3 w-40">
                    <Slider value={stories} onValueChange={setStories} max={10} step={1} className="flex-1" />
                    <span className="text-sm font-bold w-6 text-right">{stories[0]}</span>
                  </div>
                </div>
              </div>

              {/* Cost estimate */}
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total piezas</span>
                  <span className="font-semibold text-foreground">{totalPieces}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Costo estimado</span>
                  <span className="font-semibold text-foreground">~${(totalPieces * 0.004).toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Modelos</span>
                  <span>Sonnet + Haiku</span>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!selectedClient || !brief.trim() || generating}
                className="w-full bg-gradient-to-r from-violet-500 to-emerald-500 text-white shadow-lg hover:shadow-xl transition-all h-11 text-sm font-medium"
              >
                {generating ? 'Generando...' : `✦ Generar ${totalPieces} piezas`}
              </Button>
            </CardContent>
          </Card>

          {/* Brand context preview */}
          {client && (
            <Card className="border-0 shadow-sm">
              <div className="h-1" style={{ background: `linear-gradient(to right, ${client.primaryColor}, ${client.secondaryColor})` }} />
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Contexto de marca</p>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded" style={{ background: client.primaryColor }} />
                  <span className="text-sm font-medium">{client.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{client.industry}</Badge>
                </div>
                <p className="text-xs text-muted-foreground italic">"{client.toneOfVoice}"</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results */}
        <div className="col-span-3">
          {generating && (
            <Card className="border-0 shadow-sm mb-4">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-emerald-100 mb-3">
                  <span className="text-xl animate-spin">✦</span>
                </div>
                <h3 className="font-semibold mb-1">Generando contenido...</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  IA trabajando con el brief para {client?.name}
                </p>
                <Progress value={Math.min(progress, 100)} className="h-2 max-w-xs mx-auto" />
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.min(Math.round(progress / (100 / totalPieces)), totalPieces)}/{totalPieces} piezas
                </p>
              </CardContent>
            </Card>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Contenido Generado</h2>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">{results.length} piezas listas</Badge>
              </div>
              {results.map((piece) => (
                <Card
                  key={piece.id}
                  className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setExpandedPiece(expandedPiece === piece.id ? null : piece.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant="secondary" className="text-[10px]">
                            {piece.type === 'POST' ? '▦' : piece.type === 'REEL' ? '▶' : '◯'} {piece.type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{piece.platform}</span>
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusColors[piece.status]}`}>
                            {piece.status}
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed">{piece.caption}</p>

                        {expandedPiece === piece.id && (
                          <div className="mt-3 space-y-3 pt-3 border-t animate-in">
                            {piece.hook && (
                              <div>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Hook</span>
                                <p className="text-sm text-emerald-700 font-medium mt-0.5">{piece.hook}</p>
                              </div>
                            )}
                            {piece.cta && (
                              <div>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">CTA</span>
                                <p className="text-sm text-violet-700 font-medium mt-0.5">{piece.cta}</p>
                              </div>
                            )}
                            {piece.script && (
                              <div>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Guión</span>
                                <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap bg-muted/50 rounded-lg p-3">{piece.script}</pre>
                              </div>
                            )}
                            {piece.hashtags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {piece.hashtags.map((h) => (
                                  <span key={h} className="text-[11px] text-violet-500 bg-violet-50 px-2 py-0.5 rounded-md">#{h}</span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-4 pt-2">
                              <span className="text-[10px] text-muted-foreground">Modelo: {piece.modelUsed.split('-').slice(-2).join(' ')}</span>
                              <span className="text-[10px] text-muted-foreground">Costo: ${piece.generationCost.toFixed(4)}</span>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <Button size="sm" variant="outline" className="text-xs h-7">Editar</Button>
                              <Button size="sm" className="text-xs h-7 bg-emerald-500 hover:bg-emerald-600 text-white">Aprobar</Button>
                              <Button size="sm" variant="outline" className="text-xs h-7 text-red-500 border-red-200 hover:bg-red-50">Rechazar</Button>
                              <Button size="sm" variant="outline" className="text-xs h-7 ml-auto">Programar</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!generating && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-emerald-100 flex items-center justify-center mb-4">
                <span className="text-3xl">✦</span>
              </div>
              <h3 className="text-lg font-semibold mb-1">Listo para crear</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Seleccioná un cliente, escribí un brief y elegí cuántas piezas generar.
                La IA se encarga del resto.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
