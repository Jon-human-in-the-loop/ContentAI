import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/primitives';
import { Label } from '@/components/ui/primitives';
import { Textarea } from '@/components/ui/primitives';
import { Client } from '@/data/mock';
import { api } from '@/lib/api';

const platformIcons: Record<string, string> = {
  INSTAGRAM: '📷', FACEBOOK: '📘', TIKTOK: '🎵', LINKEDIN: '💼', X: '𝕏', THREADS: '🧵',
};

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClients() {
      try {
        const data = await api('/clients');
        const mappedClients: Client[] = (data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          industry: c.industry || '',
          logoUrl: c.logoUrl || '',
          primaryColor: c.branding?.primaryColor || '#6c63ff',
          secondaryColor: c.branding?.secondaryColor || '#f0efff',
          toneOfVoice: c.branding?.toneOfVoice || '',
          totalPieces: c._count?.contentPieces || 0,
          platforms: c.socialAccounts?.map((s: any) => s.platform) || ['INSTAGRAM', 'FACEBOOK'],
        }));
        setClients(mappedClients);
      } catch (err) {
        console.error('Failed to load clients:', err);
      } finally {
        setLoading(false);
      }
    }
    loadClients();
  }, []);

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.industry.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">{clients.length} clientes activos</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-shadow">
              + Nuevo cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nombre</Label>
                  <Input placeholder="Nombre del negocio" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Rubro</Label>
                  <Input placeholder="Ej: Restaurante, Gym" className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Tono de voz</Label>
                <Textarea placeholder="Describí cómo habla esta marca..." className="mt-1" rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Color primario</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" defaultValue="#6c63ff" className="w-8 h-8 rounded border cursor-pointer" />
                    <Input placeholder="#hex" className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Color secundario</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" defaultValue="#f0efff" className="w-8 h-8 rounded border cursor-pointer" />
                    <Input placeholder="#hex" className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Fuente</Label>
                  <Input placeholder="Ej: Montserrat" className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Palabras prohibidas</Label>
                <Input placeholder="barato, gratis, oferta (separadas por coma)" className="mt-1" />
              </div>
              <Button className="w-full">Crear cliente</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="Buscar clientes por nombre o rubro..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="grid grid-cols-3 gap-4">
        {filtered.map((client) => (
          <Card
            key={client.id}
            className={`border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden ${
              selectedClient?.id === client.id ? 'ring-2 ring-violet-400' : ''
            }`}
            onClick={() => setSelectedClient(selectedClient?.id === client.id ? null : client)}
          >
            {/* Color bar */}
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(to right, ${client.primaryColor}, ${client.secondaryColor})` }} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-base font-bold shadow-lg"
                    style={{ background: client.primaryColor }}
                  >
                    {client.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{client.name}</h3>
                    <p className="text-xs text-muted-foreground">{client.industry}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-3 line-clamp-2 italic">"{client.toneOfVoice}"</p>

              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {client.platforms.map((p) => (
                    <span key={p} className="text-sm" title={p}>
                      {platformIcons[p]}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground font-medium">{client.totalPieces} piezas</span>
              </div>

              {/* Colors preview */}
              <div className="flex gap-1.5 mt-3">
                <div className="w-6 h-6 rounded-md shadow-inner border border-black/5" style={{ background: client.primaryColor }} title="Primario" />
                <div className="w-6 h-6 rounded-md shadow-inner border border-black/5" style={{ background: client.secondaryColor }} title="Secundario" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Client detail panel */}
      {selectedClient && (
        <Card className="border-0 shadow-lg animate-in">
          <div className="h-2 w-full" style={{ background: `linear-gradient(to right, ${selectedClient.primaryColor}, ${selectedClient.secondaryColor})` }} />
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-xl"
                  style={{ background: selectedClient.primaryColor }}
                >
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{selectedClient.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedClient.industry}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Editar</Button>
                <Button size="sm" className="bg-gradient-to-r from-violet-500 to-violet-600 text-white">
                  Generar contenido
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Tono de voz</p>
                <p className="text-sm italic text-muted-foreground">"{selectedClient.toneOfVoice}"</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Plataformas</p>
                <div className="flex gap-2">
                  {selectedClient.platforms.map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs">
                      {platformIcons[p]} {p}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Colores de marca</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg shadow-inner border" style={{ background: selectedClient.primaryColor }} />
                  <span className="text-xs text-muted-foreground font-mono">{selectedClient.primaryColor}</span>
                  <div className="w-8 h-8 rounded-lg shadow-inner border" style={{ background: selectedClient.secondaryColor }} />
                  <span className="text-xs text-muted-foreground font-mono">{selectedClient.secondaryColor}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
