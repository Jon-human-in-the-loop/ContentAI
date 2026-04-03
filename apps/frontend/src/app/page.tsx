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
import { LoginPage } from '@/components/pages/LoginPage';
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

export default function Home() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  // Check for existing session on mount (localStorage is client-only)
  useEffect(() => {
    const existing = getSession();
    if (existing) {
      setSession(existing as AuthSession);
    }
    setReady(true);
  }, []);

  const handleLogin = (s: AuthSession) => setSession(s);

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setCurrentPage('dashboard');
  };

  // Avoid flash of login screen while checking localStorage
  if (!ready) return null;

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

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
