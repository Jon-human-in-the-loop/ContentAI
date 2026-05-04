'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Sidebar } from '@/components/layout/Sidebar';
import { getSession, clearSession, saveSession, isAuthenticated, AuthSession } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/primitives';
import { I18nProvider, useI18n } from '@/lib/i18n';

const PageLoader = () => {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    </div>
  );
};

const DashboardPage = dynamic(() => import('@/components/pages/DashboardPage').then(m => ({ default: m.DashboardPage })), { loading: PageLoader, ssr: false });
const ClientsPage   = dynamic(() => import('@/components/pages/ClientsPage').then(m => ({ default: m.ClientsPage })),     { loading: PageLoader, ssr: false });
const GeneratePage  = dynamic(() => import('@/components/pages/GeneratePage').then(m => ({ default: m.GeneratePage })),   { loading: PageLoader, ssr: false });
const ContentPage   = dynamic(() => import('@/components/pages/ContentPage').then(m => ({ default: m.ContentPage })),     { loading: PageLoader, ssr: false });
const CalendarPage  = dynamic(() => import('@/components/pages/CalendarPage').then(m => ({ default: m.CalendarPage })),   { loading: PageLoader, ssr: false });
const AnalyticsPage = dynamic(() => import('@/components/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })), { loading: PageLoader, ssr: false });
const SettingsPage  = dynamic(() => import('@/components/pages/SettingsPage').then(m => ({ default: m.SettingsPage })),   { loading: PageLoader, ssr: false });
const ConfigPage    = dynamic(() => import('@/components/pages/ConfigPage').then(m => ({ default: m.ConfigPage })),       { loading: PageLoader, ssr: false });
const LoginPage     = dynamic(() => import('@/components/pages/LoginPage').then(m => ({ default: m.LoginPage })),         { ssr: false });

export interface PageContext {
  clientId?: string;
  pieceId?: string;
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageContext, setPageContext] = useState<PageContext>({});
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Check auth on mount
  useEffect(() => {
    if (isAuthenticated()) {
      const existing = getSession();
      const token = typeof window !== 'undefined' ? localStorage.getItem('contentai_token') || '' : '';
      if (existing) {
        setSession({ ...existing, token } as AuthSession);
      }
    }
    setAuthChecked(true);
  }, []);


  // Cross-page navigation via custom event: navigate({ page: 'generate', clientId: '...' })
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ page: string } & PageContext>).detail;
      const { page, ...ctx } = detail;
      setCurrentPage(page);
      setPageContext(ctx);
    };
    window.addEventListener('contentai:navigate', handler);
    return () => window.removeEventListener('contentai:navigate', handler);
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setPageContext({});
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setCurrentPage('dashboard');
    setPageContext({});
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'clients': return <ClientsPage />;
      case 'generate': return <GeneratePage initialClientId={pageContext.clientId} />;
      case 'content': return <ContentPage />;
      case 'calendar': return <CalendarPage />;
      case 'analytics': return <AnalyticsPage />;
      case 'settings': return <SettingsPage />;
      case 'config': return <ConfigPage />;
      default: return <DashboardPage />;
    }
  };

  // While checking localStorage, show nothing to avoid flash
  if (!authChecked) return null;

  // Not authenticated → show login
  if (!session) {
    return (
      <LoginPage
        onLogin={(s) => {
          saveSession(s);
          setSession(s);
        }}
      />
    );
  }

  return (
    <I18nProvider>
      <ToastProvider>
        <div className="flex min-h-screen bg-background">
          <Sidebar
            currentPage={currentPage}
            onNavigate={handleNavigate}
            user={session.user}
            organization={session.organization}
            onLogout={handleLogout}
          />
          <main className="flex-1 p-8 overflow-auto max-h-screen">
            {renderPage()}
          </main>
        </div>
      </ToastProvider>
    </I18nProvider>
  );
}
