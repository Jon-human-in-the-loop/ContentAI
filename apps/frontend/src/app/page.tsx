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

const pages: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  clients: ClientsPage,
  generate: GeneratePage,
  content: ContentPage,
  calendar: CalendarPage,
  analytics: AnalyticsPage,
  settings: SettingsPage,
};

const DEMO_SESSION: AuthSession = {
  token: '',
  user: { id: 'demo-user', email: 'demo@contentai.app', name: 'Demo User', role: 'OWNER' },
  organization: { id: 'demo-org', name: 'Mi Agencia', plan: 'STARTER' },
};

export default function Home() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [session, setSession] = useState<AuthSession>(DEMO_SESSION);

  // If a real session exists in localStorage, use it instead
  useEffect(() => {
    const existing = getSession();
    if (existing) {
      setSession(existing as AuthSession);
    }
  }, []);

  const handleLogout = () => {
    clearSession();
    setSession(DEMO_SESSION);
    setCurrentPage('dashboard');
  };

  const PageComponent = pages[currentPage] || DashboardPage;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        user={session.user}
        organization={session.organization}
        onLogout={handleLogout}
      />
      <main className="flex-1 p-8 overflow-auto max-h-screen">
        <PageComponent />
      </main>
    </div>
  );
}
