import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/primitives';
import { Label } from '@/components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/primitives';
import { Slider } from '@/components/ui/primitives';
import { Progress } from '@/components/ui/primitives';
import { api } from '@/lib/api';

const statusColors: Record<string, string> = {
  GENERATING: 'bg-amber-100 text-amber-700',
  DRAFT: 'bg-slate-100 text-slate-600',
  APPROVED: 'bg-blue-100 text-blue-700',
  SCHEDULED: 'bg-violet-100 text-violet-700',
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-600',
};

const typeIcon: Record<string, string> = {
  POST: '▦',
  REEL: '▶',
  STORY: '◯',
  CAROUSEL: '▦▦',
};

interface GeneratePageProps {
  initialClientId?: string;
}

export function GeneratePage({ initialClientId }: GeneratePageProps = {}) {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState(initialClientId || '');
  const [brief, setBrief] = useState('');
  const [posts, setPosts] = useState([3]);
  const [reels, setReels] = useState([1]);
  const [stories, setStories] = useState([2]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [expandedPiece, setExpandedPiece] = useState<string | null>(null);
  const [piecesCache, setPiecesCache] = useState<Record<string, any>>({});
  const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});
  const [pieceImages, setPieceImages] = useState<Record<string, string>>({});
  const [generatingPrompts, setGeneratingPrompts] = useState<Record<string, boolean>>({});
  const [piecePrompts, setPiecePrompts] = useState<Record<string, string>>({});
  const [generatingVideos, setGeneratingVideos] = useState<Record<string, boolean>>({});
  const [videoJobs, setVideoJobs] = useState<Record<string, { id: string; status: string; videoUrl?: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api('/clients')
      .then(data => setClients(data || []))
      .catch(() => {});
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, []);

  // Apply initialClientId when it changes (navigation from ClientsPage)
  useEffect(() => {
    if (initialClientId) setSelectedClient(initialClientId);
  }, [initialClientId]);

  const totalPieces = posts[0] + reels[0] + stories[0];
  const client = clients.find((c) => c.id === selectedClient);

  const handleGenerate = async () => {
    if (!selectedClient || !brief.trim()) return;
    setGenerating(true);
    setProgress(5);
    setProgressLabel('Enviando solicitud...');
    setResults([]);
    setError(null);
    if (pollRef.current) clearTimeout(pollRef.current);

    let requestId: string;
    try {
      const response = await api('/content/requests', {
        method: 'POST',
        body: JSON.stringify({
          clientId: selectedClient,
          brief,
          contentTypes: {
            ...(posts[0] > 0 ? { POST: posts[0] } : {}),
            ...(reels[0] > 0 ? { REEL: reels[0] } : {}),
            ...(stories[0] > 0 ? { STORY: stories[0] } : {}),
          },
        }),
      });
      requestId = response.id;
      setProgressLabel('Generando con IA...');
      setProgress(15);
    } catch (err: any) {
      setError(err?.message || 'Error al crear la solicitud');
      setGenerating(false);
      return;
    }

    // Poll until all pieces are no longer in GENERATING state
    let attempts = 0;
    const maxAttempts = 72; // 6 min max at 5s intervals

    const poll = async () => {
      try {
        const requests = await api('/content/requests');
        const req = (requests || []).find((r: any) => r.id === requestId);

        if (req) {
          const pieces = req.pieces || [];
          const done = pieces.filter((p: any) => p.status !== 'GENERATING');
          const pct = totalPieces > 0 ? 15 + (done.length / totalPieces) * 80 : 15;
          setProgress(Math.min(pct, 95));
          setProgressLabel(`${done.length}/${totalPieces} piezas listas...`);

          const allDone = pieces.length >= totalPieces && done.length === pieces.length;
          if (allDone || attempts >= maxAttempts) {
            setResults(pieces);
            setProgress(100);
            setProgressLabel('¡Listo!');
            setGenerating(false);
            return;
          }
        }
      } catch {
        // transient error, keep polling
      }

      attempts++;
      pollRef.current = setTimeout(poll, 5000);
    };

    pollRef.current = setTimeout(poll, 4000);
  };

  const handleExpand = async (pieceId: string) => {
    const newId = expandedPiece === pieceId ? null : pieceId;
    setExpandedPiece(newId);
    if (newId && !piecesCache[newId]) {
      try {
        const full = await api(`/content/pieces/${newId}`);
        setPiecesCache(prev => ({ ...prev, [newId]: full }));
      } catch {}
    }
  };

  const handleApprove = async (pieceId: string) => {
    try {
      await api(`/content/pieces/${pieceId}/approve`, { method: 'PATCH' });
      setResults(prev => prev.map(p => p.id === pieceId ? { ...p, status: 'APPROVED' } : p));
    } catch {}
  };

  const handleReject = async (pieceId: string) => {
    try {
      await api(`/content/pieces/${pieceId}/reject`, { method: 'PATCH' });
      setResults(prev => prev.map(p => p.id === pieceId ? { ...p, status: 'REJECTED' } : p));
    } catch {}
  };

  const handleGeneratePrompt = async (pieceId: string) => {
    setGeneratingPrompts(prev => ({ ...prev, [pieceId]: true }));
    try {
      const data = await api(`/content/pieces/${pieceId}/image-prompt`, { method: 'POST' });
      if (data?.success && data?.prompt) {
        setPiecePrompts(prev => ({ ...prev, [pieceId]: data.prompt }));
      }
    } catch {}
    finally {
      setGeneratingPrompts(prev => ({ ...prev, [pieceId]: false }));
    }
  };

  const handleGenerateImage = async (pieceId: string) => {
    setGeneratingImages(prev => ({ ...prev, [pieceId]: true }));
    try {
      const data = await api(`/content/pieces/${pieceId}/generate-image`, {
        method: 'POST',
        body: JSON.stringify({ prompt: piecePrompts[pieceId] }),
      });
      if (data?.success) {
        const imageUrl = data.imageUrl || (data.imageBase64 ? `data:${data.mimeType};base64,${data.imageBase64}` : null);
        if (imageUrl) setPieceImages(prev => ({ ...prev, [pieceId]: imageUrl }));
      }
    } catch {}
    finally {
      setGeneratingImages(prev => ({ ...prev, [pieceId]: false }));
    }
  };

  const handleGenerateVideo = async (pieceId: string) => {
    setGeneratingVideos(prev => ({ ...prev, [pieceId]: true }));
    try {
      const data = await api('/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          imageUrl: pieceImages[pieceId] || '',
          audioUrl: '',
          contentPieceId: pieceId,
        }),
      });
      if (data?.success && data?.videoJobId) {
        setVideoJobs(prev => ({ ...prev, [pieceId]: { id: data.videoJobId, status: 'processing' } }));
        const pollVideo = async () => {
          const status = await api(`/video/jobs/${data.videoJobId}`);
          if (status?.success) {
            setVideoJobs(prev => ({ ...prev, [pieceId]: { id: data.videoJobId, status: status.status, videoUrl: status.videoUrl } }));
            if (status.status !== 'done' && status.status !== 'failed') setTimeout(pollVideo, 5000);
          }
        };
        setTimeout(pollVideo, 5000);
      }
    } catch {}
    finally {
      setGeneratingVideos(prev => ({ ...prev, [pieceId]: false }));
    }
  };

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
                          <div className="w-4 h-4 rounded" style={{ background: c.primaryColor || c.branding?.primaryColor || '#7c3aed' }} />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Brief / Prompt</Label>
                    <button 
                      onClick={async () => {
                        const clientInfo = clients.find(c => c.id === selectedClient);
                        const clientName = clientInfo?.name || 'el cliente';
                        const industry = clientInfo?.industry || 'su sector principal';
                        const toneInfo = clientInfo?.toneOfVoice || clientInfo?.branding?.toneOfVoice || '';
                        
                        setIsGeneratingIdea(true);
                        try {
                          const toneInstruction = toneInfo
                            ? `El tono de voz de la marca es: "${toneInfo}".`
                            : `El tono debe ser profesional y persuasivo.`;

                          const instruction = `Eres un estratega de contenido digital experto en marketing.

Tu tarea es escribir un BRIEF DE CONTENIDO (no el contenido en sí). Este brief es un set de instrucciones claras que alguien usará para pedirle a un creador o a una IA que genere el post final.

Datos del cliente:
- Marca: ${clientName}
- Nicho: ${industry}
- ${toneInstruction}

El brief debe indicar:
1. El TEMA o ángulo concreto del post (un problema, error común, dato, comparación, etc.)
2. El TONO y estilo de escritura requerido
3. El OBJETIVO del post (qué debe sentir o hacer el lector)
4. El CTA explícito (qué acción se quiere provocar)
5. Un dato o elemento concreto a incluir (estadística, anécdota, comparación, etc.)

FORMATO DE SALIDA: Texto plano, máximo 5-6 líneas, redactado como instrucciones directas al creador. Empieza con el tema. Ejemplo de formato correcto:
"Habla sobre los 3 errores más comunes que cometen [tipo de cliente] al [acción]. El tono debe ser [tono]. El objetivo es que [emoción/acción deseada]. El CTA debe invitar a [acción concreta]. Menciona que [dato o hecho relevante]."

NO escribas el post. NO uses bullet points. NO añadas introducción ni cierre. Solo el brief.`;
                          
                          const randomSeed = Math.floor(Math.random() * 100000);
                          const encodedInstruction = encodeURIComponent(instruction);
                          const response = await fetch(`https://text.pollinations.ai/${encodedInstruction}?seed=${randomSeed}`);
                          
                          if (!response.ok) throw new Error(`Falla en el servicio de IA Libre: ${response.status}`);
                          const textData = await response.text();
                          if (textData) {
                            setBrief(textData);
                          } else {
                            throw new Error("Respuesta de IA vacía");
                          }
                        } catch (err) {
                          console.log("Fallback a prompt hardcodeado", err);
                          setBrief(`Habla sobre los 3 errores más comunes que cometen los prospectos de ${clientName} en el nicho de ${industry}. El tono debe ser directo cuestionando sus métricas actuales. El objetivo es que se den cuenta que están perdiendo dinero y el CTA debe invitarlos a agendar nuestra auditoría o sesión estratégica gratuita. Menciona que el costo de adquisición subió drásticamente este año.`);
                        } finally {
                          setIsGeneratingIdea(false);
                        }
                      }}
                      disabled={isGeneratingIdea}
                      className="text-[10px] text-violet-600 font-medium hover:text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-100 px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingIdea ? '✨ Pensando...' : '🪄 Dame una idea (Asistente AI)'}
                    </button>
                  </div>
                  <span className="text-[10px] text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 hidden sm:flex">✦ IA Copywriter</span>
                </div>
                <Textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Ej: [Contexto] Habla sobre los 3 errores más comunes en Meta Ads hoy. [Objetivo] Invitarlos a agendar la auditoría gratuita. [Particularidad] Menciona que el CPC subió un 25% este año."
                  className="mt-1.5 min-h-[120px] resize-y"
                />
                <div className="mt-2 text-[11px] text-muted-foreground leading-relaxed bg-slate-50 border border-slate-100 p-2.5 rounded-md">
                  <span className="font-medium text-slate-700 block mb-1">💡 Tips para un mejor resultado:</span>
                  <ul className="list-disc pl-3 space-y-0.5 text-slate-500">
                    <li><strong>Contexto:</strong> Di de qué trata la pieza y el formato (directo, agresivo, empático).</li>
                    <li><strong>Objetivo:</strong> Cuál es el llamado a la acción (CTA) deseado.</li>
                    <li><strong>Particularidad:</strong> Inventa un dato clave o métrica, la IA de ContentAI lo desarrollará.</li>
                    <li className="text-violet-600/80">O simplemente dale al botón <strong>Dame una idea</strong> para autocompletar usando inteligencia artificial.</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Cantidad por tipo</p>
                {[
                  { icon: '▦', label: 'Posts', value: posts, set: setPosts, max: 30 },
                  { icon: '▶', label: 'Reels', value: reels, set: setReels, max: 20 },
                  { icon: '◯', label: 'Stories', value: stories, set: setStories, max: 30 },
                ].map(({ icon, label, value, set, max }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{icon}</span>
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <div className="flex items-center gap-3 w-40">
                      <Slider value={value} onValueChange={set} max={max} step={1} className="flex-1" />
                      <span className="text-sm font-bold w-6 text-right">{value[0]}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                {[['Total piezas', totalPieces], ['Posts', posts[0]], ['Reels', reels[0]], ['Stories', stories[0]]].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between text-xs text-muted-foreground">
                    <span>{k}</span>
                    <span className={k === 'Total piezas' ? 'font-semibold text-foreground' : ''}>{v}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 rounded-lg p-3">{error}</div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={!selectedClient || !brief.trim() || generating}
                className="w-full bg-gradient-to-r from-violet-500 to-emerald-500 text-white shadow-lg hover:shadow-xl transition-all h-11 text-sm font-medium"
              >
                {generating ? 'Generando...' : `✦ Generar ${totalPieces} piezas`}
              </Button>
            </CardContent>
          </Card>

          {client && (
            <Card className="border-0 shadow-sm">
              <div className="h-1" style={{ background: `linear-gradient(to right, ${client.primaryColor || client.branding?.primaryColor || '#7c3aed'}, ${client.secondaryColor || client.branding?.secondaryColor || '#10b981'})` }} />
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Contexto de marca</p>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded" style={{ background: client.primaryColor || client.branding?.primaryColor || '#7c3aed' }} />
                  <span className="text-sm font-medium">{client.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{client.industry}</Badge>
                </div>
                {(client.toneOfVoice || client.branding?.toneOfVoice) && (
                  <p className="text-xs text-muted-foreground italic">"{client.toneOfVoice || client.branding?.toneOfVoice}"</p>
                )}
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
                  {progressLabel || `IA trabajando con el brief para ${client?.name}`}
                </p>
                <Progress value={Math.min(progress, 100)} className="h-2 max-w-xs mx-auto" />
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.min(Math.round((progress - 15) / 80 * totalPieces), totalPieces)}/{totalPieces} piezas
                </p>
              </CardContent>
            </Card>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Contenido Generado</h2>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  {results.length} piezas listas
                </Badge>
              </div>
              {results.map((piece) => {
                const full = piecesCache[piece.id];
                return (
                  <Card
                    key={piece.id}
                    className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleExpand(piece.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge variant="secondary" className="text-[10px]">
                              {typeIcon[piece.type] || '▦'} {piece.type}
                            </Badge>
                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusColors[piece.status] || ''}`}>
                              {piece.status}
                            </Badge>
                          </div>
                          <p className="text-sm leading-relaxed">{piece.caption}</p>

                          {expandedPiece === piece.id && (
                            <div className="mt-3 space-y-3 pt-3 border-t animate-in" onClick={e => e.stopPropagation()}>
                              {(full?.hook || piece.hook) && (
                                <div>
                                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Hook</span>
                                  <p className="text-sm text-emerald-700 font-medium mt-0.5">{full?.hook || piece.hook}</p>
                                </div>
                              )}
                              {full?.cta && (
                                <div>
                                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">CTA</span>
                                  <p className="text-sm text-violet-700 font-medium mt-0.5">{full.cta}</p>
                                </div>
                              )}
                              {full?.script && (
                                <div>
                                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Guión</span>
                                  <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap bg-muted/50 rounded-lg p-3">{full.script}</pre>
                                </div>
                              )}
                              {full?.hashtags?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {full.hashtags.map((h: string) => (
                                    <span key={h} className="text-[11px] text-violet-500 bg-violet-50 px-2 py-0.5 rounded-md">#{h}</span>
                                  ))}
                                </div>
                              )}
                              {!full && (
                                <p className="text-xs text-muted-foreground animate-pulse">Cargando detalles...</p>
                              )}

                              {/* Image generation — POST and CAROUSEL */}
                              {(piece.type === 'POST' || piece.type === 'CAROUSEL') && (
                                <div className="pt-2 space-y-2">
                                  {pieceImages[piece.id] ? (
                                    <div className="rounded-lg overflow-hidden border border-border/50">
                                      <img src={pieceImages[piece.id]} alt="Imagen generada" className="w-full object-cover max-h-64" />
                                      <div className="flex items-center justify-between px-2 py-1.5 bg-muted/30">
                                        <span className="text-[10px] text-muted-foreground">Imagen generada con Gemini</span>
                                        <button className="text-[10px] text-violet-500 hover:underline" onClick={() => handleGenerateImage(piece.id)}>
                                          Regenerar
                                        </button>
                                      </div>
                                    </div>
                                  ) : piecePrompts[piece.id] ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Prompt de imagen (editable)</span>
                                        <button className="text-[10px] text-violet-500 hover:underline" onClick={() => handleGeneratePrompt(piece.id)}>
                                          Regenerar prompt
                                        </button>
                                      </div>
                                      <textarea
                                        value={piecePrompts[piece.id]}
                                        onChange={e => setPiecePrompts(prev => ({ ...prev, [piece.id]: e.target.value }))}
                                        className="text-xs w-full min-h-[80px] bg-muted/30 border border-violet-200 focus:border-violet-400 rounded-lg p-2 outline-none resize-none"
                                      />
                                      <Button
                                        size="sm"
                                        className="text-xs h-7 bg-gradient-to-r from-violet-500 to-emerald-500 text-white w-full"
                                        onClick={() => handleGenerateImage(piece.id)}
                                        disabled={generatingImages[piece.id]}
                                      >
                                        {generatingImages[piece.id] ? <span className="flex items-center gap-1.5"><span className="animate-spin">✦</span> Generando...</span> : '✦ Generar imagen con Gemini'}
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7 border-dashed border-violet-300 text-violet-600 hover:bg-violet-50 w-full"
                                      onClick={() => handleGeneratePrompt(piece.id)}
                                      disabled={generatingPrompts[piece.id]}
                                    >
                                      {generatingPrompts[piece.id] ? <span className="flex items-center gap-1.5"><span className="animate-spin">✦</span> Creando prompt...</span> : '✦ Crear prompt de imagen'}
                                    </Button>
                                  )}
                                </div>
                              )}

                              {/* Video generation — REEL and STORY */}
                              {(piece.type === 'REEL' || piece.type === 'STORY') && (
                                <div className="pt-2">
                                  {videoJobs[piece.id]?.videoUrl ? (
                                    <div className="rounded-lg overflow-hidden border border-border/50">
                                      <video src={videoJobs[piece.id].videoUrl} controls className="w-full max-h-64" />
                                      <div className="px-2 py-1.5 bg-muted/30">
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
                                      onClick={() => handleGenerateVideo(piece.id)}
                                      disabled={generatingVideos[piece.id]}
                                    >
                                      {generatingVideos[piece.id] ? <span className="flex items-center gap-1.5"><span className="animate-spin">✦</span> Iniciando...</span> : '▶ Generar video con avatar'}
                                    </Button>
                                  )}
                                </div>
                              )}

                              <div className="flex gap-2 pt-2">
                                <Button size="sm" className="text-xs h-7 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => handleApprove(piece.id)} disabled={piece.status === 'APPROVED'}>
                                  Aprobar
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs h-7 text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleReject(piece.id)} disabled={piece.status === 'REJECTED'}>
                                  Rechazar
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs h-7 ml-auto">
                                  Programar
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {!generating && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-emerald-100 flex items-center justify-center mb-4">
                <span className="text-3xl">✦</span>
              </div>
              <h3 className="text-lg font-semibold mb-1">Listo para crear</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Seleccioná un cliente, escribí un brief y elegí cuántas piezas generar. La IA se encarga del resto.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
