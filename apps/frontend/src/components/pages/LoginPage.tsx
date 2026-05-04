'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';
import { Label } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { saveSession, AuthSession } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';

interface LoginPageProps {
  onLogin: (session: AuthSession) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const { t, language, setLanguage } = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    organizationName: '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let session: AuthSession;

      if (mode === 'login') {
        session = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
      } else {
        if (!form.name || !form.organizationName) {
          setError(t('common.required_fields'));
          setLoading(false);
          return;
        }
        session = await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            name: form.name,
            organizationName: form.organizationName,
          }),
        });
      }

      saveSession(session);
      onLogin(session);
    } catch (err: any) {
      setError(err.message || t('common.unexpected_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 flex items-center justify-center p-4">
      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-10">
        <div className="flex items-center gap-1 p-1 bg-white/[0.05] rounded-lg border border-white/[0.08] backdrop-blur-md">
          <button 
            onClick={() => setLanguage('es')}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
              language === 'es' 
                ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20' 
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            ES
          </button>
          <button 
            onClick={() => setLanguage('en')}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
              language === 'en' 
                ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20' 
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-emerald-400 shadow-xl shadow-violet-500/30 mb-4">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">ContentAI</h1>
          <p className="text-white/40 text-sm mt-1">{t('sidebar.agency_platform')}</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm shadow-2xl">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 p-1 bg-white/[0.05] rounded-lg">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-all ${
                mode === 'login'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {t('login.login')}
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-all ${
                mode === 'register'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {t('login.register')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <>
                <div>
                  <Label className="text-xs text-white/60">{t('login.name')}</Label>
                  <Input
                    placeholder={language === 'es' ? "Ej: Juan García" : "e.g. John Doe"}
                    className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/20 focus:border-violet-500/50"
                    value={form.name}
                    onChange={set('name')}
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs text-white/60">{t('login.org_name')}</Label>
                  <Input
                    placeholder={language === 'es' ? "Ej: Digital Studio" : "e.g. Digital Studio"}
                    className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/20 focus:border-violet-500/50"
                    value={form.organizationName}
                    onChange={set('organizationName')}
                    required
                  />
                </div>
              </>
            )}

            <div>
              <Label className="text-xs text-white/60">{t('login.email')}</Label>
              <Input
                type="email"
                placeholder="tu@agencia.com"
                className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/20 focus:border-violet-500/50"
                value={form.email}
                onChange={set('email')}
                required
              />
            </div>

            <div>
              <Label className="text-xs text-white/60">{t('login.password')}</Label>
              <Input
                type="password"
                placeholder="••••••••"
                className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/20 focus:border-violet-500/50"
                value={form.password}
                onChange={set('password')}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white font-medium shadow-lg shadow-violet-500/25 mt-2"
              disabled={loading}
            >
              {loading
                ? t('common.loading')
                : mode === 'login'
                ? t('login.submit')
                : t('login.register_submit')}
            </Button>
          </form>

          {mode === 'login' && (
            <p className="text-center text-xs text-white/30 mt-4">
              {t('login.no_account')}{' '}
              <button onClick={() => setMode('register')} className="text-violet-400 hover:text-violet-300 underline">
                {t('login.register')}
              </button>
            </p>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          © {new Date().getFullYear()} ContentAI · All rights reserved
        </p>
      </div>
    </div>
  );
}
