import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/primitives';
import { Label } from '@/components/ui/primitives';
import { Textarea } from '@/components/ui/primitives';
import { Client } from '@/data/mock';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

const platformIcons: Record<string, string> = {
  INSTAGRAM: '📷', FACEBOOK: '📘', TIKTOK: '🎵', LINKEDIN: '💼', X: '𝕏', THREADS: '🧵',
};

const ALL_PLATFORMS = ['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'X', 'THREADS'];

const platformLabels: Record<string, string> = {
  INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook', TIKTOK: 'TikTok',
  LINKEDIN: 'LinkedIn', X: 'X (Twitter)', THREADS: 'Threads',
};

interface NewClientForm {
  name: string;
  industry: string;
  website: string;
  description: string;
  toneOfVoice: string;
  targetAudience: string;
  primaryColor: string;
  secondaryColor: string;
  font: string;
  keywords: string;
  prohibitedWords: string;
  platforms: string[];
}

const emptyForm: NewClientForm = {
  name: '',
  industry: '',
  website: '',
  description: '',
  toneOfVoice: '',
  targetAudience: '',
  primaryColor: '#6c63ff',
  secondaryColor: '#f0efff',
  font: '',
  keywords: '',
  prohibitedWords: '',
  platforms: ['INSTAGRAM'],
};

interface NotebookEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  updatedAt: string;
}

export function ClientsPage() {
  const { t } = useI18n();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<NewClientForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<NewClientForm>(emptyForm);
  const [editSaving, setEditSaving] = useState(false);

  // Notebook state
  const [notebookEntries, setNotebookEntries] = useState<NotebookEntry[]>([]);
  const [notebookLoading, setNotebookLoading] = useState(false);
  const [showNotebookForm, setShowNotebookForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState({ title: '', content: '', category: 'general' });

  const NOTEBOOK_CATEGORIES = [
    { value: 'brand_voice', label: t('clients.notebook_cat_voice') },
    { value: 'audience', label: t('clients.notebook_cat_audience') },
    { value: 'competitors', label: t('clients.notebook_cat_competitors') },
    { value: 'guidelines', label: t('clients.notebook_cat_guidelines') },
    { value: 'reference', label: t('clients.notebook_cat_reference') },
    { value: 'general', label: t('clients.notebook_cat_general') },
  ];

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

  const togglePlatform = (p: string) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter(x => x !== p)
        : [...prev.platforms, p],
    }));
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.industry.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        industry: form.industry.trim(),
        website: form.website.trim() || undefined,
        description: form.description.trim() || undefined,
        branding: {
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          fontPrimary: form.font.trim() || undefined,
          toneOfVoice: form.toneOfVoice.trim() || undefined,
          sampleContent: form.targetAudience.trim() || undefined,
          styleKeywords: form.keywords ? form.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
          prohibitions: form.prohibitedWords ? form.prohibitedWords.split(',').map(w => w.trim()).filter(Boolean) : [],
        },
      };
      const created = await api('/clients', { method: 'POST', body: JSON.stringify(payload) });
      setClients(prev => [...prev, {
        id: created.id,
        name: created.name,
        industry: created.industry || '',
        logoUrl: created.logoUrl || '',
        primaryColor: created.branding?.primaryColor || form.primaryColor,
        secondaryColor: created.branding?.secondaryColor || form.secondaryColor,
        toneOfVoice: created.branding?.toneOfVoice || '',
        totalPieces: 0,
        platforms: form.platforms,
      }]);
      setForm(emptyForm);
      setDialogOpen(false);
    } catch (err: any) {
      console.error('Failed to create client:', err);
      alert(t('common.error') + ': ' + (err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (client: Client) => {
    setEditForm({
      name: client.name,
      industry: client.industry,
      website: '',
      description: '',
      toneOfVoice: client.toneOfVoice || '',
      targetAudience: '',
      primaryColor: client.primaryColor,
      secondaryColor: client.secondaryColor,
      font: '',
      keywords: '',
      prohibitedWords: '',
      platforms: client.platforms || ['INSTAGRAM'],
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedClient || !editForm.name.trim() || !editForm.industry.trim()) return;
    setEditSaving(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        industry: editForm.industry.trim(),
        website: editForm.website.trim() || undefined,
        description: editForm.description.trim() || undefined,
        branding: {
          primaryColor: editForm.primaryColor,
          secondaryColor: editForm.secondaryColor,
          fontPrimary: editForm.font.trim() || undefined,
          toneOfVoice: editForm.toneOfVoice.trim() || undefined,
          sampleContent: editForm.targetAudience.trim() || undefined,
          styleKeywords: editForm.keywords ? editForm.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
          prohibitions: editForm.prohibitedWords ? editForm.prohibitedWords.split(',').map(w => w.trim()).filter(Boolean) : [],
        },
      };
      const updated = await api(`/clients/${selectedClient.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      const mapped: Client = {
        ...selectedClient,
        name: updated.name,
        industry: updated.industry || '',
        primaryColor: updated.branding?.primaryColor || editForm.primaryColor,
        secondaryColor: updated.branding?.secondaryColor || editForm.secondaryColor,
        toneOfVoice: updated.branding?.toneOfVoice || '',
        platforms: editForm.platforms,
      };
      setClients(prev => prev.map(c => c.id === selectedClient.id ? mapped : c));
      setSelectedClient(mapped);
      setEditDialogOpen(false);
    } catch (err: any) {
      console.error('Failed to update client:', err);
      alert(t('common.error') + ': ' + (err?.message || 'Unknown error'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleGenerateContent = (clientId: string) => {
    window.dispatchEvent(new CustomEvent('contentai:navigate', { detail: { page: 'generate', clientId } }));
  };

  // Load notebook when a client is selected
  useEffect(() => {
    if (!selectedClient) {
      setNotebookEntries([]);
      return;
    }
    async function loadNotebook() {
      setNotebookLoading(true);
      try {
        const data = await api(`/notebook/${selectedClient!.id}/entries`);
        setNotebookEntries(data || []);
      } catch (err) {
        console.error('Failed to load notebook:', err);
      } finally {
        setNotebookLoading(false);
      }
    }
    loadNotebook();
  }, [selectedClient?.id]);

  const handleSaveEntry = async () => {
    if (!selectedClient || !entryForm.title.trim() || !entryForm.content.trim()) return;
    try {
      if (editingEntry) {
        const updated = await api(`/notebook/entries/${editingEntry}`, {
          method: 'PUT',
          body: JSON.stringify(entryForm),
        });
        setNotebookEntries(prev => prev.map(e => e.id === editingEntry ? updated : e));
      } else {
        const created = await api(`/notebook/${selectedClient.id}/entries`, {
          method: 'POST',
          body: JSON.stringify(entryForm),
        });
        setNotebookEntries(prev => [created, ...prev]);
      }
      setEntryForm({ title: '', content: '', category: 'general' });
      setShowNotebookForm(false);
      setEditingEntry(null);
    } catch (err) {
      console.error('Failed to save notebook entry:', err);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await api(`/notebook/entries/${entryId}`, { method: 'DELETE' });
      setNotebookEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const startEditEntry = (entry: NotebookEntry) => {
    setEntryForm({ title: entry.title, content: entry.content, category: entry.category });
    setEditingEntry(entry.id);
    setShowNotebookForm(true);
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('clients.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('clients.subtitle', { count: clients.length })}</p>
        </div>

        {/* ── New Client Dialog ── */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-shadow"
              onClick={() => setDialogOpen(true)}
            >
              {t('clients.new')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('clients.dialog_title')}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{t('clients.dialog_subtitle')}</p>
            </DialogHeader>

            <div className="space-y-5 pt-1">

              {/* ── Section 1: Basic Data ── */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">{t('clients.section_basic')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{t('clients.field_name')}</Label>
                    <Input
                      placeholder={t('clients.field_name_placeholder')}
                      className="mt-1"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t('clients.field_industry')}</Label>
                    <Input
                      placeholder={t('clients.field_industry_placeholder')}
                      className="mt-1"
                      value={form.industry}
                      onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label className="text-xs">{t('clients.field_website')}</Label>
                    <Input
                      placeholder="https://..."
                      className="mt-1"
                      value={form.website}
                      onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t('clients.field_font')}</Label>
                    <Input
                      placeholder={t('clients.field_font_placeholder')}
                      className="mt-1"
                      value={form.font}
                      onChange={e => setForm(p => ({ ...p, font: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="text-xs">{t('clients.field_description')}</Label>
                  <Textarea
                    placeholder={t('clients.field_description_placeholder')}
                    className="mt-1"
                    rows={2}
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </div>

              {/* ── Section 2: Brand Identity ── */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">{t('clients.section_identity')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{t('clients.field_primary_color')}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={form.primaryColor}
                        onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))}
                        className="w-9 h-9 rounded-lg border cursor-pointer p-0.5 bg-white"
                      />
                      <Input
                        placeholder="#6c63ff"
                        className="flex-1"
                        value={form.primaryColor}
                        onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">{t('clients.field_secondary_color')}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={form.secondaryColor}
                        onChange={e => setForm(p => ({ ...p, secondaryColor: e.target.value }))}
                        className="w-9 h-9 rounded-lg border cursor-pointer p-0.5 bg-white"
                      />
                      <Input
                        placeholder="#f0efff"
                        className="flex-1"
                        value={form.secondaryColor}
                        onChange={e => setForm(p => ({ ...p, secondaryColor: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Color preview */}
                <div
                  className="mt-2 h-2 rounded-full"
                  style={{ background: `linear-gradient(to right, ${form.primaryColor}, ${form.secondaryColor})` }}
                />
              </div>

              {/* ── Section 3: Voice and Audience ── */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">{t('clients.section_voice')}</p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">{t('clients.field_tone')}</Label>
                    <Textarea
                      placeholder={t('clients.field_tone_placeholder')}
                      className="mt-1"
                      rows={2}
                      value={form.toneOfVoice}
                      onChange={e => setForm(p => ({ ...p, toneOfVoice: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t('clients.field_audience')}</Label>
                    <Input
                      placeholder={t('clients.field_audience_placeholder')}
                      className="mt-1"
                      value={form.targetAudience}
                      onChange={e => setForm(p => ({ ...p, targetAudience: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{t('clients.field_keywords')}</Label>
                      <Input
                        placeholder="healthy, organic, bienestar"
                        className="mt-1"
                        value={form.keywords}
                        onChange={e => setForm(p => ({ ...p, keywords: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t('clients.field_prohibited')}</Label>
                      <Input
                        placeholder="barato, gratis, oferta"
                        className="mt-1"
                        value={form.prohibitedWords}
                        onChange={e => setForm(p => ({ ...p, prohibitedWords: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Section 4: Platforms ── */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">{t('clients.section_platforms')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {ALL_PLATFORMS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                        form.platforms.includes(p)
                          ? 'border-violet-400 bg-violet-50 text-violet-700 font-medium'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <span>{platformIcons[p]}</span>
                      <span className="text-xs">{platformLabels[p]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Submit ── */}
              <Button
                className="w-full bg-gradient-to-r from-violet-500 to-violet-600 text-white h-11 font-medium shadow-lg shadow-violet-500/20"
                onClick={handleCreate}
                disabled={saving || !form.name.trim() || !form.industry.trim()}
              >
                {saving ? t('clients.submit_creating') : t('clients.submit_create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder={t('clients.search_placeholder')}
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
                <span className="text-xs text-muted-foreground font-medium">{client.totalPieces} {t('dashboard.pieces_label')}</span>
              </div>

              <div className="flex gap-1.5 mt-3">
                <div className="w-6 h-6 rounded-md shadow-inner border border-black/5" style={{ background: client.primaryColor }} title={t('clients.color_primary')} />
                <div className="w-6 h-6 rounded-md shadow-inner border border-black/5" style={{ background: client.secondaryColor }} title={t('clients.color_secondary')} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Edit Client Dialog ── */}
      {editDialogOpen && selectedClient && typeof window !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }} onClick={() => setEditDialogOpen(false)}>
          <div style={{ display: 'flex', minHeight: '100%', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-semibold mb-0.5">{t('clients.edit_title', { name: selectedClient.name })}</h2>
              <p className="text-xs text-muted-foreground mb-5">{t('clients.edit_subtitle')}</p>

              <div className="space-y-5">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">{t('clients.section_basic')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">{t('clients.field_name')}</Label><Input className="mt-1" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
                    <div><Label className="text-xs">{t('clients.field_industry')}</Label><Input className="mt-1" value={editForm.industry} onChange={e => setEditForm(p => ({ ...p, industry: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div><Label className="text-xs">{t('clients.field_website')}</Label><Input placeholder="https://..." className="mt-1" value={editForm.website} onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))} /></div>
                    <div><Label className="text-xs">{t('clients.field_font')}</Label><Input placeholder={t('clients.field_font_placeholder')} className="mt-1" value={editForm.font} onChange={e => setEditForm(p => ({ ...p, font: e.target.value }))} /></div>
                  </div>
                  <div className="mt-3"><Label className="text-xs">{t('clients.field_description')}</Label><Textarea className="mt-1" rows={2} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">{t('clients.section_identity')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{t('clients.field_primary_color')}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={editForm.primaryColor} onChange={e => setEditForm(p => ({ ...p, primaryColor: e.target.value }))} className="w-9 h-9 rounded-lg border cursor-pointer p-0.5 bg-white" />
                        <Input className="flex-1" value={editForm.primaryColor} onChange={e => setEditForm(p => ({ ...p, primaryColor: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">{t('clients.field_secondary_color')}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={editForm.secondaryColor} onChange={e => setEditForm(p => ({ ...p, secondaryColor: e.target.value }))} className="w-9 h-9 rounded-lg border cursor-pointer p-0.5 bg-white" />
                        <Input className="flex-1" value={editForm.secondaryColor} onChange={e => setEditForm(p => ({ ...p, secondaryColor: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 h-2 rounded-full" style={{ background: `linear-gradient(to right, ${editForm.primaryColor}, ${editForm.secondaryColor})` }} />
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">{t('clients.section_voice')}</p>
                  <div className="space-y-3">
                    <div><Label className="text-xs">{t('clients.field_tone')}</Label><Textarea className="mt-1" rows={2} value={editForm.toneOfVoice} onChange={e => setEditForm(p => ({ ...p, toneOfVoice: e.target.value }))} /></div>
                    <div><Label className="text-xs">{t('clients.field_audience')}</Label><Input className="mt-1" value={editForm.targetAudience} onChange={e => setEditForm(p => ({ ...p, targetAudience: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">{t('clients.field_keywords')}</Label><Input placeholder="healthy, organic" className="mt-1" value={editForm.keywords} onChange={e => setEditForm(p => ({ ...p, keywords: e.target.value }))} /></div>
                      <div><Label className="text-xs">{t('clients.field_prohibited')}</Label><Input placeholder="barato, gratis" className="mt-1" value={editForm.prohibitedWords} onChange={e => setEditForm(p => ({ ...p, prohibitedWords: e.target.value }))} /></div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">{t('clients.section_platforms')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ALL_PLATFORMS.map(p => (
                      <button key={p} type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, platforms: prev.platforms.includes(p) ? prev.platforms.filter(x => x !== p) : [...prev.platforms, p] }))}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${editForm.platforms.includes(p) ? 'border-violet-400 bg-violet-50 text-violet-700 font-medium' : 'border-border bg-background text-muted-foreground hover:bg-muted/50'}`}
                      >
                        <span>{platformIcons[p]}</span><span className="text-xs">{platformLabels[p]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setEditDialogOpen(false)}>{t('common.cancel')}</Button>
                  <Button className="flex-1 bg-gradient-to-r from-violet-500 to-violet-600 text-white h-11 font-medium" onClick={handleUpdate} disabled={editSaving || !editForm.name.trim() || !editForm.industry.trim()}>
                    {editSaving ? t('clients.submit_saving') : t('clients.submit_save')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

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
                <Button variant="outline" size="sm" onClick={() => openEditDialog(selectedClient)}>{t('common.edit')}</Button>
                <Button size="sm" className="bg-gradient-to-r from-violet-500 to-violet-600 text-white" onClick={() => handleGenerateContent(selectedClient.id)}>
                  {t('clients.generate_content')}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">{t('clients.field_tone')}</p>
                <p className="text-sm italic text-muted-foreground">"{selectedClient.toneOfVoice}"</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">{t('clients.section_platforms')}</p>
                <div className="flex gap-2 flex-wrap">
                  {selectedClient.platforms.map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs">
                      {platformIcons[p]} {p}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">{t('clients.section_identity')}</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg shadow-inner border" style={{ background: selectedClient.primaryColor }} />
                  <span className="text-xs text-muted-foreground font-mono">{selectedClient.primaryColor}</span>
                  <div className="w-8 h-8 rounded-lg shadow-inner border" style={{ background: selectedClient.secondaryColor }} />
                  <span className="text-xs text-muted-foreground font-mono">{selectedClient.secondaryColor}</span>
                </div>
              </div>
            </div>

            {/* ── Brand Notebook ── */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t('clients.notebook_title')}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t('clients.notebook_subtitle')}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 border-dashed"
                  onClick={() => { setShowNotebookForm(true); setEditingEntry(null); setEntryForm({ title: '', content: '', category: 'general' }); }}
                >
                  {t('clients.notebook_add')}
                </Button>
              </div>

              {/* Entry form */}
              {showNotebookForm && (
                <div className="bg-muted/30 rounded-lg p-4 mb-4 space-y-3 border border-dashed border-violet-200">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">{t('clients.notebook_field_title')}</Label>
                      <Input
                        placeholder={t('clients.notebook_field_title_placeholder')}
                        className="mt-1"
                        value={entryForm.title}
                        onChange={e => setEntryForm(p => ({ ...p, title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t('clients.notebook_field_category')}</Label>
                      <select
                        className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                        value={entryForm.category}
                        onChange={e => setEntryForm(p => ({ ...p, category: e.target.value }))}
                      >
                        {NOTEBOOK_CATEGORIES.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">{t('clients.notebook_field_content')}</Label>
                    <Textarea
                      placeholder={t('clients.notebook_field_content_placeholder')}
                      className="mt-1 min-h-[100px]"
                      value={entryForm.content}
                      onChange={e => setEntryForm(p => ({ ...p, content: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setShowNotebookForm(false); setEditingEntry(null); }}>
                      {t('common.cancel')}
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-7 bg-violet-500 text-white hover:bg-violet-600"
                      onClick={handleSaveEntry}
                      disabled={!entryForm.title.trim() || !entryForm.content.trim()}
                    >
                      {editingEntry ? t('common.save') : t('common.ready')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Entries list */}
              {notebookLoading ? (
                <p className="text-xs text-muted-foreground text-center py-4">{t('clients.notebook_loading')}</p>
              ) : notebookEntries.length === 0 ? (
                <div className="text-center py-8 bg-muted/20 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">{t('clients.notebook_empty')}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {t('clients.notebook_empty_desc')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notebookEntries.map(entry => (
                    <div key={entry.id} className="bg-background border rounded-lg p-3 group hover:border-violet-200 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{entry.title}</span>
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                              {NOTEBOOK_CATEGORIES.find(c => c.value === entry.category)?.label || entry.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{entry.content}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <button
                            className="text-[10px] text-violet-500 hover:underline px-1"
                            onClick={() => startEditEntry(entry)}
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            className="text-[10px] text-red-400 hover:underline px-1"
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
