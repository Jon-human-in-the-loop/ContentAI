import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { api } from '@/lib/api';

// ─── Platform Definitions ────────────────────────────────────────
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
  let backendUrl = process.env.NEXT_PUBLIC_API_URL || '';
  backendUrl = backendUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  if (backendUrl && !backendUrl.startsWith('http')) {
    backendUrl = `https://${backendUrl}`;
  }
  if (!backendUrl) {
    backendUrl = 'http://localhost:4000';
  }
  return backendUrl;
}

export function SettingsPage() {
  const [connectedPlatforms] = useState<string[]>([]); // Will come from backend
  const [googleCalConnected, setGoogleCalConnected] = useState(false);
  const [loadingGoogleCal, setLoadingGoogleCal] = useState(true);

  useEffect(() => {
    async function checkGoogleCal() {
      try {
        const data = await api('/calendar/google/status');
        setGoogleCalConnected(data?.connected || false);
      } catch {
        // Not connected or endpoint not available
      } finally {
        setLoadingGoogleCal(false);
      }
    }
    checkGoogleCal();
  }, []);

  const handleConnectPlatform = (oauthPlatform: string) => {
    const clientId = '00000000-0000-0000-0000-000000000001';
    const backendUrl = getBackendUrl();
    window.location.href = `${backendUrl}/api/v1/oauth/${oauthPlatform}/authorize?clientId=${clientId}`;
  };

  const handleConnectGoogleCalendar = () => {
    const backendUrl = getBackendUrl();
    window.location.href = `${backendUrl}/api/v1/calendar/google/authorize`;
  };

  const handleDisconnectGoogleCalendar = async () => {
    try {
      await api('/calendar/google/disconnect', { method: 'DELETE' });
      setGoogleCalConnected(false);
    } catch (err) {
      console.error('Failed to disconnect Google Calendar:', err);
    }
  };

  return (
    <div className="space-y-8 animate-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Conectá tus redes sociales y servicios para publicar contenido directamente</p>
      </div>

      {/* ─── Platforms Section ──────────────────────────────────────── */}
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
            const isConnected = connectedPlatforms.includes(platform.id);

            return (
              <Card
                key={platform.id}
                className={`border-0 shadow-sm hover:shadow-md transition-all ${
                  isConnected ? 'ring-2 ring-emerald-400/60' : ''
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-xl shadow-sm border border-slate-100">
                      {platform.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{platform.name}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{platform.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-2 py-0.5 ${
                        isConnected
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isConnected ? '● Conectada' : '○ Disponible'}
                    </Badge>

                    {isConnected ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 border-red-200 hover:bg-red-50 text-xs"
                      >
                        Desconectar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnectPlatform(platform.oauthPlatform)}
                        className="bg-gradient-to-r from-violet-500 to-violet-600 text-white text-xs shadow-sm"
                      >
                        Conectar con {platform.name}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ─── Integrations Section ─────────────────────────────────── */}
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
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm border border-slate-100">
                📅
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Google Calendar</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Exporta automáticamente el contenido programado a tu Google Calendar
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Badge
                variant="secondary"
                className={`text-[10px] px-2 py-0.5 ${
                  googleCalConnected
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {loadingGoogleCal ? '...' : googleCalConnected ? '● Conectado' : '○ Disponible'}
              </Badge>

              {googleCalConnected ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-500 border-red-200 hover:bg-red-50 text-xs"
                  onClick={handleDisconnectGoogleCalendar}
                >
                  Desconectar
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleConnectGoogleCalendar}
                  className="bg-gradient-to-r from-blue-500 to-sky-500 text-white text-xs shadow-sm"
                >
                  Conectar Google Calendar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Security Notice ───────────────────────────────────────── */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-violet-50/80 to-emerald-50/50">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-lg shrink-0">🛡️</div>
            <div>
              <p className="text-sm font-semibold text-violet-900">Seguridad de tus conexiones</p>
              <ul className="text-xs text-violet-700/70 mt-2 space-y-1.5">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span><strong>OAuth 2.0</strong> — Sos redirigido a la página oficial de cada plataforma para autorizar. Nunca manejamos tus contraseñas.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span><strong>Tokens encriptados</strong> — Los Access Tokens de cada servicio se almacenan cifrados y se refrescan automáticamente cuando expiran.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span><strong>Sin contraseñas</strong> — En ningún momento pedimos ni almacenamos tus credenciales.</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
