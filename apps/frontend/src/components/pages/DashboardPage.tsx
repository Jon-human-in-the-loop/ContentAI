import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/primitives';
import { Progress } from '@/components/ui/primitives';
import { api } from '@/lib/api';

const statusColors: Record<string, string> = {
  GENERATING: 'bg-amber-100 text-amber-700',
  DRAFT: 'bg-slate-100 text-slate-600',
  APPROVED: 'bg-blue-100 text-blue-700',
  SCHEDULED: 'bg-violet-100 text-violet-700',
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-600',
  PROCESSING: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-600',
  PENDING: 'bg-slate-100 text-slate-600',
};

const typeIcons: Record<string, string> = {
  POST: '▦', REEL: '▶', STORY: '◯', CAROUSEL: '⧉',
};

export function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [recentPieces, setRecentPieces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [dashStats, rawClients, rawRequests] = await Promise.all([
          api('/analytics/dashboard').catch(() => null),
          api('/clients').catch(() => []),
          api('/content/requests').catch(() => [])
        ]);
        
        setStats(dashStats || {
          overview: { totalClients: 0, monthlyPieces: 0, totalPieces: 0 },
          costs: { monthlySpend: 0, apiCalls: 0, tokenBudget: { usagePercent: 0, used: 0, limit: 1000000 } },
        });
        
        const mappedClients = (rawClients || []).map((c: any) => ({
          ...c,
          primaryColor: c.branding?.primaryColor || '#6c63ff',
          secondaryColor: c.branding?.secondaryColor || '#f0efff',
          totalPieces: c._count?.contentPieces || 0,
        }));
        setClients(mappedClients);
        
        setRequests(rawRequests || []);
        
        // Extract recent pieces from requests to display
        const allPieces = (rawRequests || []).flatMap((r: any) => r.pieces || []);
        // simple sort by createdAt if available
        allPieces.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecentPieces(allPieces.slice(0, 6));
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setStats({
          overview: { totalClients: 0, monthlyPieces: 0, totalPieces: 0 },
          costs: { monthlySpend: 0, apiCalls: 0, tokenBudget: { usagePercent: 0, used: 0, limit: 1000000 } },
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="p-8">Cargando dashboard...</div>;

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Vista general de tu plataforma de contenido</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Clientes', value: stats.overview?.totalClients || 0, sub: 'activos', accent: 'from-violet-500 to-violet-600' },
          { label: 'Piezas este mes', value: stats.overview?.monthlyPieces || 0, sub: `${stats.overview?.totalPieces || 0} total`, accent: 'from-emerald-500 to-emerald-600' },
          { label: 'Gasto del mes', value: `$${stats.costs?.monthlySpend || 0}`, sub: `${stats.costs?.apiCalls || 0} llamadas API`, accent: 'from-amber-500 to-orange-500' },
          { label: 'Uso Tokens', value: `${(stats.costs?.tokenBudget?.usagePercent || 0).toFixed(1)}%`, sub: 'presupuesto usado', accent: 'from-sky-500 to-blue-600' },
        ].map((s, i) => (
          <Card key={i} className="stat-glow border-0 shadow-sm">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11.5px] uppercase tracking-wider text-muted-foreground font-medium">{s.label}</p>
                  <p className="text-[28px] font-bold mt-1 tracking-tight">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.accent} flex items-center justify-center text-white/90 text-lg shadow-lg`}>
                  {['◎', '✦', '$', '⚡'][i]}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-5 gap-5">
        {/* Recent requests */}
        <div className="col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Requests Recientes</h2>
            <span className="text-xs text-muted-foreground">{requests.length} requests</span>
          </div>
          {requests.map((req) => (
            <Card key={req.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-semibold text-sm">{req.client?.name || 'Unknown'}</span>
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusColors[req.status] || ''}`}>
                        {req.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{req.brief}</p>
                    <div className="flex items-center gap-3 mt-2.5">
                      {req.contentTypes && Object.entries(req.contentTypes).map(([type, count]) => (
                        <span key={type} className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="text-[10px]">{typeIcons[type] || ''}</span>
                          {String(count)} {type.toLowerCase()}s
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground mb-1">{req.completedPieces || 0}/{req.totalPieces || 0}</div>
                    <Progress value={((req.completedPieces || 0) / (req.totalPieces || 1)) * 100} className="w-20 h-1.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {requests.length === 0 && (
            <div className="text-sm text-center py-8 text-muted-foreground bg-white/50 border border-dashed rounded-xl">
              No hay requests recientes
            </div>
          )}
        </div>

        {/* Clients sidebar */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Clientes</h2>
            <span className="text-xs text-muted-foreground">{clients.length} activos</span>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {clients.map((client, i) => (
                <div
                  key={client.id}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                    i < clients.length - 1 ? 'border-b border-border/50' : ''
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: client.primaryColor }}
                  >
                    {client.name?.charAt(0) || 'C'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{client.name}</div>
                    <div className="text-[11px] text-muted-foreground">{client.industry || 'No especificado'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-medium">{client.totalPieces}</div>
                    <div className="text-[10px] text-muted-foreground">piezas</div>
                  </div>
                </div>
              ))}
              {clients.length === 0 && (
                <div className="text-xs text-center p-4 text-muted-foreground">
                  No hay clientes registrados
                </div>
              )}
            </CardContent>
          </Card>

          {/* Token budget */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">Presupuesto de tokens</p>
              <div className="space-y-2.5">
                <Progress value={stats.costs?.tokenBudget?.usagePercent || 0} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{((stats.costs?.tokenBudget?.used || 0) / 1e6).toFixed(1)}M usados</span>
                  <span>{((stats.costs?.tokenBudget?.limit || 1) / 1e6).toFixed(0)}M límite</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent content */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Últimas Piezas Generadas</h2>
        <div className="grid grid-cols-3 gap-4">
          {recentPieces.map((piece, i) => (
            <Card key={piece.id || i} className="border-0 shadow-sm hover:shadow-md transition-all group cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{typeIcons[piece.type] || ''} {piece.type}</span>
                    <span className="text-[10px] text-muted-foreground">• {piece.platform || 'N/A'}</span>
                  </div>
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusColors[piece.status] || ''}`}>
                    {piece.status}
                  </Badge>
                </div>
                <p className="text-xs font-medium mb-1">{piece.client?.name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {piece.caption || 'Generando...'}
                </p>
                {piece.hashtags && piece.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {piece.hashtags.slice(0, 3).map((h: string) => (
                      <span key={h} className="text-[10px] text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded">#{h}</span>
                    ))}
                    {piece.hashtags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{piece.hashtags.length - 3}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {recentPieces.length === 0 && (
            <div className="col-span-3 text-sm text-center py-8 text-muted-foreground bg-white/50 border border-dashed rounded-xl">
              No hay piezas generadas
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
