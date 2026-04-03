'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Sidebar } from '@/components/layout/Sidebar';
import { getSession, clearSession, AuthSession } from '@/lib/auth';

const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">Cargando...</p>
    </div>
  </div>
);

const DashboardPage = dynamic(() => import('@/components/pages/DashboardPage').then(m => ({ default: m.DashboardPage })), { loading: PageLoader, ssr: false });
const ClientsPage   = dynamic(() => import('@/components/pages/ClientsPage').then(m => ({ default: m.ClientsPage })),     { loading: PageLoader, ssr: false });
const GeneratePage  = dynamic(() => import('@/components/pages/GeneratePage').then(m => ({ default: m.GeneratePage })),   { loading: PageLoader, ssr: false });
const ContentPage   = dynamic(() => import('@/components/pages/ContentPage').then(m => ({ default: m.ContentPage })),     { loading: PageLoader, ssr: false });
const CalendarPage  = dynamic(() => import('@/components/pages/CalendarPage').then(m => ({ default: m.CalendarPage })),   { loading: PageLoader, ssr: false });
const AnalyticsPage = dynamic(() => import('@/components/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })), { loading: PageLoader, ssr: false });
const SettingsPage  = dynamic(() => import('@/components/pages/SettingsPage').then(m => ({ default: m.SettingsPage })),   { loading: PageLoader, ssr: false });
const ConfigPage    = dynamic(() => import('@/components/pages/ConfigPage').then(m => ({ default: m.ConfigPage })),       { loading: PageLoader, ssr: false });

export interface PageContext {
  clientId?: string;
  pieceId?: string;
}

const DEMO_SESSION: AuthSession = {
  token: '',
  user: { id: 'demo-user', email: 'demo@contentai.app', name: 'Demo User', role: 'OWNER' },
  organization: { id: 'demo-org', name: 'Mi Agencia', plan: 'STARTER' },
};

export default function Home() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageContext, setPageContext] = useState<PageContext>({});
  const [session, setSession] = useState<AuthSession>(DEMO_SESSION);

  useEffect(() => {
    const existing = getSession();
    if (existing) setSession(existing as AuthSession);
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
    setSession(DEMO_SESSION);
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

  return (
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
  );
}
