'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardPage } from '@/components/pages/DashboardPage';
import { ClientsPage } from '@/components/pages/ClientsPage';
import { GeneratePage } from '@/components/pages/GeneratePage';
import { ContentPage } from '@/components/pages/ContentPage';
import { CalendarPage } from '@/components/pages/CalendarPage';
import { AnalyticsPage } from '@/components/pages/AnalyticsPage';
import { SettingsPage } from '@/components/pages/SettingsPage';

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
  const PageComponent = pages[currentPage] || DashboardPage;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 p-8 overflow-auto max-h-screen">
        <PageComponent />
      </main>
    </div>
  );
}
