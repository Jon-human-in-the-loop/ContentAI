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
  const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});
  const [pieceImages, setPieceImages] = useState<Record<string, string>>({});
  const [generatingPrompts, setGeneratingPrompts] = useState<Record<string, boolean>>({});
  const [piecePrompts, setPiecePrompts] = useState<Record<string, string>>({});
  const [generatingVideos, setGeneratingVideos] = useState<Record<string, boolean>>({});
  const [videoJobs, setVideoJobs] = useState<Record<string, { id: string; status: string; videoUrl?: string }>>({});

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

  const handleGeneratePrompt = async (pieceId: string) => {
    setGeneratingPrompts(prev => ({ ...prev, [pieceId]: true }));
    try {
      const data = await api(`/content/pieces/${pieceId}/image-prompt`, { method: 'POST' });
      if (data?.success && data?.prompt) {
        setPiecePrompts(prev => ({ ...prev, [pieceId]: data.prompt }));
      }
    } catch (err) {
      console.error('Prompt generation failed:', err);
    } finally {
      setGeneratingPrompts(prev => ({ ...prev, [pieceId]: false }));
    }
  };

  const handleGenerateImage = async (pieceId: string) => {
    setGeneratingImages(prev => ({ ...prev, [pieceId]: true }));
    try {
      const prompt = piecePrompts[pieceId] || undefined;
      const data = await api(`/content/pieces/${pieceId}/generate-image`, {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
      if (data?.success) {
        // Prefer persisted URL from S3, fall back to base64 data URL
        const imageUrl = data.imageUrl || (data.imageBase64 ? `data:${data.mimeType};base64,${data.imageBase64}` : null);
        if (imageUrl) {
          setPieceImages(prev => ({ ...prev, [pieceId]: imageUrl }));
        }
      }
    } catch (err) {
      console.error('Image generation failed:', err);
    } finally {
      setGeneratingImages(prev => ({ ...prev, [pieceId]: false }));
    }
  };

  const handleGenerateVideo = async (pieceId: string) => {
    setGeneratingVideos(prev => ({ ...prev, [pieceId]: true }));
    try {
      // For now, we use placeholder URLs — in production these would come from
      // an uploaded avatar image and TTS audio generated from the script
      const data = await api('/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          imageUrl: pieceImages[pieceId] || '',
          audioUrl: '', // TODO: integrate TTS for audio from script
          contentPieceId: pieceId,
        }),
      });
      if (data?.success && data?.videoJobId) {
        setVideoJobs(prev => ({ ...prev, [pieceId]: { id: data.videoJobId, status: 'processing' } }));
        // Poll for status
        const pollStatus = async () => {
          const status = await api(`/video/jobs/${data.videoJobId}`);
          if (status?.success) {
            setVideoJobs(prev => ({ ...prev, [pieceId]: { id: data.videoJobId, status: status.status, videoUrl: status.videoUrl } }));
            if (status.status !== 'done' && status.status !== 'failed') {
              setTimeout(pollStatus, 5000);
            }
          }
        };
        setTimeout(pollStatus, 5000);
      }
    } catch (err) {
      console.error('Video generation failed:', err);
    } finally {
      setGeneratingVideos(prev => ({ ...prev, [pieceId]: false }));
    }
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
                    <Slider value={posts} onValueChange={setPosts} max={30} step={1} className="flex-1" />
                    <span className="text-sm font-bold w-6 text-right">{posts[0]}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">▶</span>
                    <span className="text-sm font-medium">Reels</span>
                  </div>
                  <div className="flex items-center gap-3 w-40">
                    <Slider value={reels} onValueChange={setReels} max={20} step={1} className="flex-1" />
                    <span className="text-sm font-bold w-6 text-right">{reels[0]}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">◯</span>
                    <span className="text-sm font-medium">Stories</span>
                  </div>
                  <div className="flex items-center gap-3 w-40">
                    <Slider value={stories} onValueChange={setStories} max={30} step={1} className="flex-1" />
                    <span className="text-sm font-bold w-6 text-right">{stories[0]}</span>
                  </div>
                </div>
              </div>

              {/* Resumen de generación */}
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total piezas</span>
                  <span className="font-semibold text-foreground">{totalPieces}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Posts</span>
                  <span>{posts[0]}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Reels</span>
                  <span>{reels[0]}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Stories</span>
                  <span>{stories[0]}</span>
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
                            {/* Image generation — only for POST and CAROUSEL */}
                            {(piece.type === 'POST' || piece.type === 'CAROUSEL') && (
                              <div className="pt-2 space-y-2">
                                {pieceImages[piece.id] ? (
                                  <div className="rounded-lg overflow-hidden border border-border/50">
                                    <img
                                      src={pieceImages[piece.id]}
                                      alt="Imagen generada con IA"
                                      className="w-full object-cover max-h-64"
                                    />
                                    <div className="flex items-center justify-between px-2 py-1.5 bg-muted/30">
                                      <span className="text-[10px] text-muted-foreground">Imagen generada con Gemini</span>
                                      <button
                                        className="text-[10px] text-violet-500 hover:underline"
                                        onClick={(e) => { e.stopPropagation(); handleGenerateImage(piece.id); }}
                                      >
                                        Regenerar
                                      </button>
                                    </div>
                                  </div>
                                ) : piecePrompts[piece.id] ? (
                                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Prompt de imagen (editable)</span>
                                      <button
                                        className="text-[10px] text-violet-500 hover:underline"
                                        onClick={() => handleGeneratePrompt(piece.id)}
                                      >
                                        Regenerar prompt
                                      </button>
                                    </div>
                                    <Textarea
                                      value={piecePrompts[piece.id]}
                                      onChange={(e) => setPiecePrompts(prev => ({ ...prev, [piece.id]: e.target.value }))}
                                      className="text-xs min-h-[80px] bg-muted/30 border-violet-200 focus:border-violet-400"
                                    />
                                    <Button
                                      size="sm"
                                      className="text-xs h-7 bg-gradient-to-r from-violet-500 to-emerald-500 text-white w-full"
                                      onClick={() => handleGenerateImage(piece.id)}
                                      disabled={generatingImages[piece.id]}
                                    >
                                      {generatingImages[piece.id] ? (
                                        <span className="flex items-center gap-1.5">
                                          <span className="animate-spin">✦</span> Generando imagen...
                                        </span>
                                      ) : (
                                        '✦ Generar imagen con Gemini'
                                      )}
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 border-dashed border-violet-300 text-violet-600 hover:bg-violet-50 w-full"
                                    onClick={(e) => { e.stopPropagation(); handleGeneratePrompt(piece.id); }}
                                    disabled={generatingPrompts[piece.id]}
                                  >
                                    {generatingPrompts[piece.id] ? (
                                      <span className="flex items-center gap-1.5">
                                        <span className="animate-spin">✦</span> Creando prompt con IA...
                                      </span>
                                    ) : (
                                      '✦ Crear prompt de imagen'
                                    )}
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Video generation — for REEL and STORY */}
                            {(piece.type === 'REEL' || piece.type === 'STORY') && (
                              <div className="pt-2">
                                {videoJobs[piece.id]?.videoUrl ? (
                                  <div className="rounded-lg overflow-hidden border border-border/50">
                                    <video
                                      src={videoJobs[piece.id].videoUrl}
                                      controls
                                      className="w-full max-h-64"
                                    />
                                    <div className="flex items-center justify-between px-2 py-1.5 bg-muted/30">
                                      <span className="text-[10px] text-muted-foreground">Video generado con Creatify Aurora</span>
                                    </div>
                                  </div>
                                ) : videoJobs[piece.id]?.status === 'processing' ? (
                                  <div className="flex items-center gap-2 text-xs text-violet-600 bg-violet-50 rounded-lg p-2">
                                    <span className="animate-spin">✦</span>
                                    <span>Generando video con avatar...</span>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 border-dashed border-violet-300 text-violet-600 hover:bg-violet-50 w-full"
                                    onClick={(e) => { e.stopPropagation(); handleGenerateVideo(piece.id); }}
                                    disabled={generatingVideos[piece.id]}
                                  >
                                    {generatingVideos[piece.id] ? (
                                      <span className="flex items-center gap-1.5">
                                        <span className="animate-spin">✦</span> Iniciando...
                                      </span>
                                    ) : (
                                      '▶ Generar video con avatar'
                                    )}
                                  </Button>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-4 pt-2">
                              <span className="text-[10px] text-muted-foreground">Generado con IA</span>
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
