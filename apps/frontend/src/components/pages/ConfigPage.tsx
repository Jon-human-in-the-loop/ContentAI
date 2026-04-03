'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/primitives';
import { api } from '@/lib/api';

interface ServiceStatus {
  configured: boolean;
  label: string;
  description: string;
  envVars: string[];
  docsUrl?: string;
}

type ConfigStatus = Record<string, Record<string, ServiceStatus>>;

const categoryMeta: Record<string, { icon: string; title: string; priority: 'critical' | 'high' | 'medium' | 'low' }> = {
  core:          { icon: '🏗️', title: 'Infraestructura', priority: 'critical' },
  ai:            { icon: '✦', title: 'Modelos de IA', priority: 'critical' },
  social:        { icon: '🌐', title: 'Redes Sociales (OAuth)', priority: 'high' },
  storage:       { icon: '📦', title: 'Almacenamiento', priority: 'medium' },
  billing:       { icon: '💳', title: 'Stripe (Billing)', priority: 'medium' },
  notifications: { icon: '📧', title: 'Email (SMTP)', priority: 'medium' },
  video:         { icon: '▶', title: 'Video / TTS', priority: 'low' },
};

const priorityLabel: Record<string, { text: string; className: string }> = {
  critical: { text: 'Crítico', className: 'bg-red-100 text-red-700' },
  high:     { text: 'Alto', className: 'bg-orange-100 text-orange-700' },
  medium:   { text: 'Medio', className: 'bg-amber-100 text-amber-700' },
  low:      { text: 'Opcional', className: 'bg-slate-100 text-slate-500' },
};

export function ConfigPage() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/admin/config-status')
      .then(data => setStatus(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalServices = status ? Object.values(status).flatMap(cat => Object.values(cat)).length : 0;
  const configuredServices = status ? Object.values(status).flatMap(cat => Object.values(cat)).filter(s => s.configured).length : 0;

  return (
    <div className="space-y-8 animate-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Estado de Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Revisá qué servicios están activos y qué variables de entorno necesitás configurar
        </p>
      </div>

      {/* Summary */}
      {status && (
        <Card className="border-0 shadow-sm bg-gradient-to-r from-violet-50 to-emerald-50/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {configuredServices}/{totalServices} servicios configurados
                </p>
                <div className="w-64 h-2 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${(configuredServices / totalServices) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                {configuredServices === totalServices ? (
                  <p className="text-emerald-600 font-semibold text-sm">✓ Todo configurado</p>
                ) : (
                  <p className="text-amber-600 font-semibold text-sm">
                    {totalServices - configuredServices} pendiente{totalServices - configuredServices > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="text-center py-12 text-muted-foreground text-sm animate-pulse">
          Cargando estado de servicios...
        </div>
      )}

      {/* Service categories */}
      {status && Object.entries(categoryMeta).map(([catKey, meta]) => {
        const services = status[catKey];
        if (!services) return null;
        const entries = Object.entries(services);
        const configuredCount = entries.filter(([, s]) => s.configured).length;
        const prio = priorityLabel[meta.priority];

        return (
          <div key={catKey}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white text-sm">
                {meta.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold">{meta.title}</h2>
                  <Badge variant="secondary" className={`text-[10px] px-2 ${prio.className}`}>{prio.text}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{configuredCount}/{entries.length} servicios activos</p>
              </div>
            </div>

            <div className="space-y-2">
              {entries.map(([key, service]) => (
                <Card
                  key={key}
                  className={`border-0 shadow-sm transition-all ${service.configured ? 'ring-1 ring-emerald-300/60' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Status indicator */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5 ${
                        service.configured
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {service.configured ? '✓' : '○'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm">{service.label}</span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-2 py-0 ${
                              service.configured
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {service.configured ? '● Activo' : '○ Sin configurar'}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground mb-2">{service.description}</p>

                        {/* Env vars */}
                        <div className="flex flex-wrap gap-1">
                          {service.envVars.map(v => (
                            <code
                              key={v}
                              className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                                service.configured
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {v}
                            </code>
                          ))}
                        </div>
                      </div>

                      {service.docsUrl && !service.configured && (
                        <a
                          href={service.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-violet-500 hover:underline shrink-0 mt-1"
                        >
                          Docs →
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* Setup guide */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-slate-50/50">
        <CardContent className="p-5">
          <h3 className="font-semibold text-sm mb-3">📋 Cómo configurar en Railway</h3>
          <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Abrí tu proyecto en <strong>Railway Dashboard</strong></li>
            <li>Seleccioná el servicio de <strong>backend</strong></li>
            <li>Andá a <strong>Variables</strong> → <strong>Add Variable</strong></li>
            <li>Pegá las variables de entorno necesarias</li>
            <li>Railway hace el redeploy automático</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-3">
            Las variables <code className="bg-muted px-1 rounded">DATABASE_URL</code> y{' '}
            <code className="bg-muted px-1 rounded">REDIS_URL</code> se configuran automáticamente
            al vincular los servicios de PostgreSQL y Redis en Railway.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
