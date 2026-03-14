import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';

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


export function SettingsPage() {
  const [connectedPlatforms] = useState<string[]>([]); // Will come from backend

  const handleConnectPlatform = (oauthPlatform: string) => {
    // TODO: When auth is wired, use the actual client ID
    const clientId = '00000000-0000-0000-0000-000000000001';
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || '';
    
    // Clean up backend URL to not include /api/v1 trailing
    backendUrl = backendUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');

    // Ensure it's an absolute URL
    if (backendUrl && !backendUrl.startsWith('http')) {
      backendUrl = `https://${backendUrl}`;
    }

    if (!backendUrl) {
      backendUrl = 'http://localhost:4000';
    }

    window.location.href = `${backendUrl}/api/v1/oauth/${oauthPlatform}/authorize?clientId=${clientId}`;
  };

  return (
    <div className="space-y-8 animate-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Conectá tus redes sociales para publicar contenido directamente</p>
      </div>

      {/* ─── Platforms Section ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white text-sm">🌐</div>
          <div>
            <h2 className="text-lg font-semibold">Plataformas</h2>
            <p className="text-xs text-muted-foreground">Conectá vía OAuth 2.0 — nunca pedimos tus contraseñas ni API keys.</p>
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
                  <span><strong>Tokens encriptados</strong> — Los Access Tokens de cada red se almacenan cifrados y se refrescan automáticamente cuando expiran.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span><strong>Sin contraseñas</strong> — En ningún momento pedimos ni almacenamos tus credenciales de redes sociales.</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
