import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { AuthUser, AuthOrg } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  user: AuthUser;
  organization: AuthOrg;
  onLogout: () => void;
}

export function Sidebar({ currentPage, onNavigate, user, organization, onLogout }: SidebarProps) {
  const { t, language, setLanguage } = useI18n();
  const [orgStats, setOrgStats] = useState({ tokensUsed: 0, monthlyTokenLimit: 1000000, plan: organization.plan || 'STARTER' });

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: '◈' },
    { id: 'clients', label: t('nav.clients'), icon: '◎' },
    { id: 'generate', label: t('nav.generate'), icon: '✦', badge: t('common.ai') },
    { id: 'content', label: t('nav.content'), icon: '▦' },
    { id: 'calendar', label: t('nav.calendar'), icon: '▣' },
    { id: 'analytics', label: t('nav.analytics'), icon: '◆' },
    { id: 'settings', label: t('nav.settings'), icon: '⚙' },
    { id: 'config', label: t('nav.system_status'), icon: '🔧' },
  ];

  useEffect(() => {
    api('/settings/organization/current')
      .then(data => setOrgStats({ tokensUsed: data.tokensUsed, monthlyTokenLimit: data.monthlyTokenLimit, plan: data.plan }))
      .catch(() => {});
  }, []);

  const tokenPercent = Math.min(
    100,
    orgStats.monthlyTokenLimit > 0 ? (orgStats.tokensUsed / orgStats.monthlyTokenLimit) * 100 : 0
  );

  const formatTokens = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
    return num.toString();
  };

  return (
    <aside className="sidebar-gradient w-[260px] min-h-screen flex flex-col text-white/90 select-none">
      {/* Brand */}
      <div className="px-6 pt-7 pb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-emerald-400 flex items-center justify-center text-white font-bold text-sm">
            C
          </div>
          <div>
            <span className="font-semibold text-[15px] tracking-tight text-white">ContentAI</span>
            <span className="block text-[11px] text-white/40 tracking-wide uppercase">{t('sidebar.agency_platform')}</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
        <div className="text-[10px] uppercase tracking-widest text-white/25 px-3 mb-3 font-semibold">
          {t('nav.menu')}
        </div>
        {navItems.map((item) => {
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-[13.5px] transition-all duration-200 group ${
                active
                  ? 'bg-white/[0.12] text-white font-medium'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
              }`}
            >
              <span className={`text-base ${active ? 'text-violet-300' : 'text-white/30 group-hover:text-white/50'}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto bg-violet-500/20 text-violet-300 border-0 text-[10px] px-1.5 py-0">
                  {item.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Language Switcher */}
      <div className="px-6 py-4 border-t border-white/[0.04]">
        <div className="flex items-center justify-between p-1 bg-white/[0.05] rounded-lg border border-white/[0.08]">
          <button 
            onClick={() => setLanguage('es')}
            className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${
              language === 'es' 
                ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20' 
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            ESPAÑOL
          </button>
          <button 
            onClick={() => setLanguage('en')}
            className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${
              language === 'en' 
                ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20' 
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            ENGLISH
          </button>
        </div>
      </div>

      {/* User + org footer */}
      <div className="px-3 mb-3">
        <div className="px-4 py-4 rounded-xl bg-white/[0.05] border border-white/[0.06]">
          {/* Org + token bar */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-violet-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {organization.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] text-white/80 font-medium truncate">{organization.name}</div>
              <div className="text-[10.5px] text-white/30">{t('common.plan')} {orgStats.plan}</div>
            </div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-violet-400 to-emerald-400 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${tokenPercent}%` }}
            />
          </div>
          <div className="text-[10px] text-white/30 mt-1.5">
            {formatTokens(orgStats.tokensUsed)} / {formatTokens(orgStats.monthlyTokenLimit)} {t('common.tokens')}
          </div>
        </div>

        {/* User row + logout */}
        <div className="flex items-center gap-2 mt-2 px-2 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group">
          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60 shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11.5px] text-white/60 truncate">{user.name}</div>
            <div className="text-[10px] text-white/25 truncate">{user.email}</div>
          </div>
          <button
            onClick={onLogout}
            title={t('nav.logout')}
            className="text-white/20 hover:text-red-400 transition-colors text-xs opacity-0 group-hover:opacity-100"
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  );
}
