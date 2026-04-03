import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/primitives';
import { Label } from '@/components/ui/primitives';
import { api } from '@/lib/api';

interface PlatformDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  oauthPlatform: string;
}

const platforms: PlatformDef[] = [
  { id: 'instagram', name: 'Instagram', icon: '📷', description: 'Fotos, reels, stories y carruseles', oauthPlatform: 'instagram' },
  { id: 'facebook', name: 'Facebook', icon: '📘', description: 'Páginas y grupos', oauthPlatform: 'facebook' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', description: 'Videos cortos y contenido viral', oauthPlatform: 'tiktok' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', description: 'Contenido corporativo y profesional', oauthPlatform: 'linkedin' },
  { id: 'x', name: 'X (Twitter)', icon: '𝕏', description: 'Tweets, hilos e interacción', oauthPlatform: 'x' },
  { id: 'threads', name: 'Threads', icon: '🧵', description: 'Publicaciones en Meta Threads', oauthPlatform: 'threads' },
];

function getBackendUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL || '';
  url = url.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  if (url && !url.startsWith('http')) url = `https://${url}`;
  if (!url) url = 'http://localhost:4000';
  return url;
}

export function SettingsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [googleCalConnected, setGoogleCalConnected] = useState(false);
  const [loadingGoogleCal, setLoadingGoogleCal] = useState(true);

  // Handle OAuth callback result in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('settings') === 'true') {
      const status = params.get('oauth');
      const platform = params.get('platform');
      if (status === 'success' && platform) {
        // Clean URL, then reload accounts
        window.history.replaceState({}, '', window.location.pathname);
      } else if (status === 'error') {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // Load clients
  useEffect(() => {
    api('/clients')
      .then(data => {
        const list = data || [];
        setClients(list);
        if (list.length > 0) setSelectedClientId(list[0].id);
      })
      .catch(() => {});
  }, []);

  // Load connected accounts for selected client
  useEffect(() => {
    if (!selectedClientId) return;
    setLoadingAccounts(true);
    api(`/oauth/accounts?clientId=${selectedClientId}`)
      .then(data => setConnectedAccounts(data || []))
      .catch(() => setConnectedAccounts([]))
      .finally(() => setLoadingAccounts(false));
  }, [selectedClientId]);

  // Check Google Calendar
  useEffect(() => {
    api('/calendar/google/status')
      .then(data => setGoogleCalConnected(data?.connected || false))
      .catch(() => {})
      .finally(() => setLoadingGoogleCal(false));
  }, []);

  const isConnected = (oauthPlatform: string) =>
    connectedAccounts.some(
      a => a.platform?.toLowerCase() === oauthPlatform.toLowerCase()
    );

  const getAccount = (oauthPlatform: string) =>
    connectedAccounts.find(a => a.platform?.toLowerCase() === oauthPlatform.toLowerCase());

  const handleConnect = (oauthPlatform: string) => {
    if (!selectedClientId) return;
    window.location.href = `${getBackendUrl()}/api/v1/oauth/${oauthPlatform}/authorize?clientId=${selectedClientId}`;
  };

  const handleDisconnect = async (oauthPlatform: string) => {
    const account = getAccount(oauthPlatform);
    if (!account?.id) return;
    try {
      await api(`/oauth/accounts/${account.id}`, { method: 'DELETE' });
      setConnectedAccounts(prev => prev.filter(a => a.id !== account.id));
    } catch {}
  };

  const handleConnectGoogleCalendar = () => {
    window.location.href = `${getBackendUrl()}/api/v1/calendar/google/authorize`;
  };

  const handleDisconnectGoogleCalendar = async () => {
    try {
      await api('/calendar/google/disconnect', { method: 'DELETE' });
      setGoogleCalConnected(false);
    } catch {}
  };

  return (
    <div className="space-y-8 animate-in max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Conectá tus redes sociales para publicar contenido directamente desde ContentAI</p>
      </div>

      {/* Client selector */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Cliente a configurar</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Seleccioná un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
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
            <div className="text-xs text-muted-foreground pt-6">
              Las conexiones OAuth son por cliente — cada cliente puede tener sus propias cuentas.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platforms */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white text-sm">🌐</div>
          <div>
            <h2 className="text-lg font-semibold">Redes Sociales</h2>
            <p className="text-xs text-muted-foreground">Conectá vía OAuth 2.0 — nunca pedimos tus contraseñas.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {platforms.map((platform) => {
            const connected = isConnected(platform.oauthPlatform);
            const account = getAccount(platform.oauthPlatform);

            return (
              <Card
                key={platform.id}
                className={`border-0 shadow-sm hover:shadow-md transition-all ${connected ? 'ring-2 ring-emerald-400/60' : ''}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-xl shadow-sm border border-slate-100">
                      {platform.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{platform.name}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {connected && account?.accountName ? account.accountName : platform.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-2 py-0.5 ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {loadingAccounts ? '...' : connected ? '● Conectada' : '○ Disponible'}
                    </Badge>

                    {connected ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 border-red-200 hover:bg-red-50 text-xs"
                        onClick={() => handleDisconnect(platform.oauthPlatform)}
                        disabled={!selectedClientId}
                      >
                        Desconectar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnect(platform.oauthPlatform)}
                        className="bg-gradient-to-r from-violet-500 to-violet-600 text-white text-xs shadow-sm"
                        disabled={!selectedClientId}
                      >
                        Conectar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Google Calendar */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center text-white text-sm">📅</div>
          <div>
            <h2 className="text-lg font-semibold">Integraciones</h2>
            <p className="text-xs text-muted-foreground">Conectá servicios externos para automatizar tu flujo de trabajo.</p>
          </div>
        </div>

        <Card className={`border-0 shadow-sm hover:shadow-md transition-all ${googleCalConnected ? 'ring-2 ring-emerald-400/60' : ''}`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm border border-slate-100">📅</div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Google Calendar</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Exporta automáticamente el contenido programado a tu Google Calendar</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge
                variant="secondary"
                className={`text-[10px] px-2 py-0.5 ${googleCalConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
              >
                {loadingGoogleCal ? '...' : googleCalConnected ? '● Conectado' : '○ Disponible'}
              </Badge>
              {googleCalConnected ? (
                <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 text-xs" onClick={handleDisconnectGoogleCalendar}>
                  Desconectar
                </Button>
              ) : (
                <Button size="sm" onClick={handleConnectGoogleCalendar} className="bg-gradient-to-r from-blue-500 to-sky-500 text-white text-xs shadow-sm">
                  Conectar Google Calendar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security notice */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-violet-50/80 to-emerald-50/50">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-lg shrink-0">🛡️</div>
            <div>
              <p className="text-sm font-semibold text-violet-900">Seguridad de tus conexiones</p>
              <ul className="text-xs text-violet-700/70 mt-2 space-y-1.5">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span><strong>OAuth 2.0</strong> — Sos redirigido a la página oficial de cada plataforma. Nunca manejamos tus contraseñas.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span><strong>Tokens encriptados</strong> — Los Access Tokens se almacenan cifrados con AES-256 y se refrescan automáticamente.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span><strong>Por cliente</strong> — Cada cliente tiene sus propias conexiones independientes.</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
