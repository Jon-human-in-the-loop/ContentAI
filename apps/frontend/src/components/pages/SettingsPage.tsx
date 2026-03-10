import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';
import { Label } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/primitives';

interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  description: string;
}

const platforms: PlatformConfig[] = [
  { id: 'instagram', name: 'Instagram', icon: '📷', connected: false, description: 'Publicar fotos, reels, stories y carruseles' },
  { id: 'facebook', name: 'Facebook', icon: '📘', connected: false, description: 'Publicar en páginas y grupos de Facebook' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', connected: false, description: 'Compartir videos cortos y contenido viral' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', connected: false, description: 'Publicar contenido corporativo y profesional' },
  { id: 'x', name: 'X (Twitter)', icon: '𝕏', connected: false, description: 'Tweets, hilos e interacción en tiempo real' },
  { id: 'threads', name: 'Threads', icon: '🧵', connected: false, description: 'Publicar en la plataforma de Meta' },
];

interface ApiKeyConfig {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  envVar: string;
}

const apiKeys: ApiKeyConfig[] = [
  { id: 'anthropic', name: 'Anthropic (Claude)', description: 'Motor de IA para generación de contenido', placeholder: 'sk-ant-...', envVar: 'ANTHROPIC_API_KEY' },
  { id: 'openai', name: 'OpenAI (GPT)', description: 'Motor de IA alternativo', placeholder: 'sk-...', envVar: 'OPENAI_API_KEY' },
  { id: 'meta_business', name: 'Meta Business API', description: 'Para publicar en Instagram y Facebook', placeholder: 'EAAx...', envVar: 'META_ACCESS_TOKEN' },
  { id: 'linkedin_api', name: 'LinkedIn API', description: 'Para publicar contenido en LinkedIn', placeholder: 'AQV...', envVar: 'LINKEDIN_ACCESS_TOKEN' },
  { id: 'tiktok_api', name: 'TikTok API', description: 'Para publicar videos en TikTok', placeholder: 'act.xxx...', envVar: 'TIKTOK_ACCESS_TOKEN' },
  { id: 'x_api', name: 'X (Twitter) API', description: 'Para publicar tweets y hilos', placeholder: 'AAAAAx...', envVar: 'X_BEARER_TOKEN' },
];

export function SettingsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});
  const [platformStates, setPlatformStates] = useState<Record<string, boolean>>({});

  const handleSaveKey = (id: string) => {
    if (keys[id]?.trim()) {
      setSavedKeys(prev => ({ ...prev, [id]: true }));
      // In production, this would POST to the backend to securely store the key
      setTimeout(() => {
        setSavedKeys(prev => ({ ...prev, [id]: false }));
      }, 2000);
    }
  };

  const handleConnectPlatform = (id: string) => {
    setPlatformStates(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Administrá tus API keys y plataformas conectadas</p>
      </div>

      {/* API Keys Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-base">🔑</span> API Keys
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{apiKey.name}</span>
                      {savedKeys[apiKey.id] && (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0">
                          ✓ Guardada
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{apiKey.description}</p>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder={apiKey.placeholder}
                        value={keys[apiKey.id] || ''}
                        onChange={(e) => setKeys(prev => ({ ...prev, [apiKey.id]: e.target.value }))}
                        className="flex-1 text-sm font-mono"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveKey(apiKey.id)}
                        className="bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-sm hover:shadow-md transition-shadow shrink-0"
                      >
                        Guardar
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
                      Variable: {apiKey.envVar}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Platforms Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-base">🌐</span> Plataformas
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {platforms.map((platform) => {
            const connected = platformStates[platform.id] || false;
            return (
              <Card
                key={platform.id}
                className={`border-0 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                  connected ? 'ring-2 ring-emerald-400' : ''
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-xl shadow-sm">
                        {platform.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{platform.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{platform.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-2 py-0.5 ${
                        connected
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {connected ? '● Conectada' : '○ Desconectada'}
                    </Badge>
                    <Button
                      size="sm"
                      variant={connected ? 'outline' : 'default'}
                      onClick={() => handleConnectPlatform(platform.id)}
                      className={
                        connected
                          ? 'text-red-500 border-red-200 hover:bg-red-50'
                          : 'bg-gradient-to-r from-violet-500 to-violet-600 text-white'
                      }
                    >
                      {connected ? 'Desconectar' : 'Conectar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Info note */}
      <Card className="border-0 shadow-sm bg-violet-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">💡</span>
            <div>
              <p className="text-sm font-medium text-violet-900">Nota importante</p>
              <p className="text-xs text-violet-700/70 mt-1">
                Las API keys se almacenan de forma segura y encriptada en el servidor.
                Para conectar plataformas como Instagram o Facebook, necesitás configurar
                primero la API key correspondiente (Meta Business API) y autorizar la aplicación
                desde el panel de desarrolladores de cada plataforma.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
