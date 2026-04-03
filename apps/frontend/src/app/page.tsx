'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardPage } from '@/components/pages/DashboardPage';
import { ClientsPage } from '@/components/pages/ClientsPage';
import { GeneratePage } from '@/components/pages/GeneratePage';
import { ContentPage } from '@/components/pages/ContentPage';
import { CalendarPage } from '@/components/pages/CalendarPage';
import { AnalyticsPage } from '@/components/pages/AnalyticsPage';
import { SettingsPage } from '@/components/pages/SettingsPage';
import { getSession, clearSession, AuthSession } from '@/lib/auth';

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
