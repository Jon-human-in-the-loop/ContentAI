import React from 'react';
import { Badge } from '@/components/ui/primitives';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'clients', label: 'Clientes', icon: '◎' },
  { id: 'generate', label: 'Generar', icon: '✦', badge: 'AI' },
  { id: 'content', label: 'Contenido', icon: '▦' },
  { id: 'calendar', label: 'Calendario', icon: '▣' },
  { id: 'analytics', label: 'Analytics', icon: '◆' },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
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
            <span className="block text-[11px] text-white/40 tracking-wide uppercase">Agency Platform</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
        <div className="text-[10px] uppercase tracking-widest text-white/25 px-3 mb-3 font-semibold">
          Menú
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

      {/* Footer */}
      <div className="px-4 py-5 mx-3 mb-4 rounded-xl bg-white/[0.05] border border-white/[0.06]">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-violet-500 flex items-center justify-center text-[11px] font-bold text-white">
            A
          </div>
          <div>
            <div className="text-[12.5px] text-white/80 font-medium">Mi Agencia</div>
            <div className="text-[10.5px] text-white/30">Plan Pro</div>
          </div>
        </div>
        <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
          <div className="bg-gradient-to-r from-violet-400 to-emerald-400 h-1.5 rounded-full" style={{ width: '57%' }} />
        </div>
        <div className="text-[10px] text-white/30 mt-1.5">2.8M / 5M tokens usados</div>
      </div>
    </aside>
  );
}
