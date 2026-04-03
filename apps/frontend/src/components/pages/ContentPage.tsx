import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/primitives';
import { Label } from '@/components/ui/primitives';
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

const platformIcons: Record<string, string> = {
  INSTAGRAM: '📷', FACEBOOK: '📘', TIKTOK: '🎵', LINKEDIN: '💼', X: '𝕏', THREADS: '🧵',
};

interface SocialAccount {
  id: string;
  platform: string;
  accountName: string | null;
  accountId: string | null;
  isExpired: boolean;
}

export function ContentPage() {
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Approve action
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Edit modal
  const [editingPiece, setEditingPiece] = useState<ContentPiece | null>(null);
  const [editForm, setEditForm] = useState({ caption: '', hashtags: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Schedule modal
  const [schedulingPiece, setSchedulingPiece] = useState<ContentPiece | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [scheduleForm, setScheduleForm] = useState({
    platform: '',
    socialAccountId: '',
    scheduledAt: '',
  });
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

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
            platform: p.platform || 'INSTAGRAM',
            status: p.status || 'DRAFT',
            caption: p.caption || '',
            hook: p.hook || '',
            cta: p.cta || '',
            script: p.script || '',
            hashtags: p.hashtags || [],
            generationCost: p.generationCost || 0,
            modelUsed: p.modelUsed || '',
            createdAt: p.createdAt || new Date().toISOString(),
            scheduledAt: p.scheduledAt || null,
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

  const handleApprove = async (pieceId: string) => {
    setApprovingId(pieceId);
    try {
      await api(`/content/pieces/${pieceId}/approve`, { method: 'PATCH' });
      setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, status: 'APPROVED' } : p));
    } catch (err) {
      console.error('Approve failed:', err);
    } finally {
      setApprovingId(null);
    }
  };

  const openScheduleModal = async (piece: ContentPiece) => {
    setSchedulingPiece(piece);
    setScheduleError('');
    // Default datetime to tomorrow at 10:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const isoLocal = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    setScheduleForm({ platform: piece.platform || 'INSTAGRAM', socialAccountId: '', scheduledAt: isoLocal });

    // Load social accounts for this client
    try {
      const accounts = await api(`/oauth/accounts?clientId=${piece.clientId}`);
      setSocialAccounts(accounts || []);
      if (accounts?.length === 1) {
        setScheduleForm(f => ({ ...f, socialAccountId: accounts[0].id, platform: accounts[0].platform }));
      }
    } catch {
      setSocialAccounts([]);
    }
  };

  const handleSchedule = async () => {
    if (!schedulingPiece || !scheduleForm.platform || !scheduleForm.scheduledAt) {
      setScheduleError('Completá todos los campos requeridos');
      return;
    }
    if (!scheduleForm.socialAccountId) {
      setScheduleError('Seleccioná una cuenta de red social');
      return;
    }
    setScheduling(true);
    setScheduleError('');
    try {
      await api('/calendar/schedule', {
        method: 'POST',
        body: JSON.stringify({
          contentPieceId: schedulingPiece.id,
          scheduledAt: new Date(scheduleForm.scheduledAt).toISOString(),
          platform: scheduleForm.platform,
          socialAccountId: scheduleForm.socialAccountId,
        }),
      });
      setPieces(prev => prev.map(p =>
        p.id === schedulingPiece.id
          ? { ...p, status: 'SCHEDULED', scheduledAt: new Date(scheduleForm.scheduledAt).toISOString() }
          : p
      ));
      setSchedulingPiece(null);
    } catch (err: any) {
      setScheduleError(err.message || 'Error al programar');
    } finally {
      setScheduling(false);
    }
  };

  const openEdit = (piece: ContentPiece) => {
    setEditingPiece(piece);
    setEditForm({ caption: piece.caption || '', hashtags: (piece.hashtags || []).join(', ') });
  };

  const handleSaveEdit = async () => {
    if (!editingPiece) return;
    setEditSaving(true);
    try {
      await api(`/content/pieces/${editingPiece.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          caption: editForm.caption,
          hashtags: editForm.hashtags ? editForm.hashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean) : [],
        }),
      });
      setPieces(prev => prev.map(p =>
        p.id === editingPiece.id
          ? { ...p, caption: editForm.caption, hashtags: editForm.hashtags ? editForm.hashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean) : [] }
          : p
      ));
      setEditingPiece(null);
    } catch (err: any) {
      console.error('Edit failed:', err);
    } finally {
      setEditSaving(false);
    }
  };

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
                <div className="flex items-center gap-1.5">
                  {piece.status === 'DRAFT' && (
                    <>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => openEdit(piece)}>Editar</Button>
                      <Button
                        size="sm"
                        className="h-6 text-[10px] px-2 bg-emerald-500 text-white hover:bg-emerald-600"
                        disabled={approvingId === piece.id}
                        onClick={() => handleApprove(piece.id)}
                      >
                        {approvingId === piece.id ? '...' : 'Aprobar'}
                      </Button>
                    </>
                  )}
                  {piece.status === 'APPROVED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2 border-violet-300 text-violet-600 hover:bg-violet-50"
                      onClick={() => openScheduleModal(piece)}
                    >
                      📅 Programar
                    </Button>
                  )}
                  {(piece.status === 'SCHEDULED' || piece.scheduledAt) && (
                    <span className="text-[10px] text-violet-600 font-medium">
                      📅 {new Date(piece.scheduledAt!).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {piece.status === 'PUBLISHED' && (
                    <span className="text-[10px] text-emerald-600 font-medium">✓ Publicado</span>
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

      {/* ── Edit Modal ── */}
      {editingPiece && typeof window !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }} onClick={() => setEditingPiece(null)}>
          <div style={{ display: 'flex', minHeight: '100%', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-semibold mb-0.5">Editar pieza</h2>
              <p className="text-xs text-muted-foreground mb-5">{editingPiece.clientName} · {editingPiece.type}</p>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Caption</Label>
                  <textarea
                    className="mt-1 w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-violet-400 resize-none"
                    value={editForm.caption}
                    onChange={e => setEditForm(f => ({ ...f, caption: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Hashtags (separados por coma)</Label>
                  <input
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-violet-400"
                    value={editForm.hashtags}
                    onChange={e => setEditForm(f => ({ ...f, hashtags: e.target.value }))}
                    placeholder="fitness, salud, bienestar"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1 text-sm h-9" onClick={() => setEditingPiece(null)}>Cancelar</Button>
                  <Button className="flex-1 text-sm h-9 bg-gradient-to-r from-violet-500 to-violet-600 text-white" onClick={handleSaveEdit} disabled={editSaving}>
                    {editSaving ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Schedule Modal (portal) ── */}
      {schedulingPiece && typeof window !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}
          onClick={() => setSchedulingPiece(null)}
        >
          <div style={{ display: 'flex', minHeight: '100%', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div
              className="bg-background rounded-xl shadow-xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Programar publicación</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {schedulingPiece.clientName} · {schedulingPiece.type}
                </p>
              </div>

              <div className="space-y-4">
                {schedulingPiece.caption && (
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-foreground/80 line-clamp-3">{schedulingPiece.caption}</p>
                  </div>
                )}

                {/* Platform selector */}
                <div>
                  <Label className="text-xs">Plataforma *</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'X', 'TIKTOK', 'THREADS'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setScheduleForm(f => ({ ...f, platform: p, socialAccountId: '' }))}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-all ${
                          scheduleForm.platform === p
                            ? 'border-violet-400 bg-violet-50 text-violet-700 font-medium'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        <span>{platformIcons[p]}</span>
                        <span>{p}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Social account selector */}
                <div>
                  <Label className="text-xs">Cuenta conectada *</Label>
                  {socialAccounts.filter(a => a.platform === scheduleForm.platform).length === 0 ? (
                    <div className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-700">
                        No hay cuentas de {scheduleForm.platform} conectadas para este cliente.
                      </p>
                      <a
                        href={`/api/v1/oauth/${scheduleForm.platform.toLowerCase()}/authorize?clientId=${schedulingPiece.clientId}`}
                        className="text-xs text-violet-600 underline mt-1 inline-block"
                      >
                        Conectar ahora →
                      </a>
                    </div>
                  ) : (
                    <select
                      className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                      value={scheduleForm.socialAccountId}
                      onChange={e => setScheduleForm(f => ({ ...f, socialAccountId: e.target.value }))}
                    >
                      <option value="">Seleccioná una cuenta</option>
                      {socialAccounts
                        .filter(a => a.platform === scheduleForm.platform)
                        .map(a => (
                          <option key={a.id} value={a.id} disabled={a.isExpired}>
                            {a.accountName || a.accountId || a.platform}
                            {a.isExpired ? ' (token vencido)' : ''}
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                {/* Date/time picker */}
                <div>
                  <Label className="text-xs">Fecha y hora de publicación *</Label>
                  <input
                    type="datetime-local"
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                    value={scheduleForm.scheduledAt}
                    min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    onChange={e => setScheduleForm(f => ({ ...f, scheduledAt: e.target.value }))}
                  />
                </div>

                {scheduleError && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {scheduleError}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1 text-xs h-9"
                    onClick={() => setSchedulingPiece(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 text-xs h-9 bg-gradient-to-r from-violet-500 to-violet-600 text-white"
                    onClick={handleSchedule}
                    disabled={scheduling || !scheduleForm.socialAccountId || !scheduleForm.scheduledAt}
                  >
                    {scheduling ? 'Programando...' : '📅 Confirmar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
