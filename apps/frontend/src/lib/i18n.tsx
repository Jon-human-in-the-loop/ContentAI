import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'es' | 'en';

interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

const translations: Translations = {
  es: {
    'nav.dashboard': 'Dashboard',
    'nav.clients': 'Clientes',
    'nav.generate': 'Generar',
    'nav.content': 'Contenido',
    'nav.calendar': 'Calendario',
    'nav.analytics': 'Analytics',
    'nav.settings': 'Configuración',
    'nav.system_status': 'Estado del Sistema',
    'nav.menu': 'Menú',
    'nav.logout': 'Cerrar sesión',
    'common.loading': 'Cargando...',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.create': 'Crear',
    'common.tokens': 'tokens',
    'common.plan': 'Plan',
    'common.ai': 'AI',
    'common.success': 'Éxito',
    'common.error': 'Error',
    'common.ready': 'Listo',
    'common.back': 'Volver',
    'common.total': 'Total',
    'sidebar.agency_platform': 'Agency Platform',
    'login.title': 'Bienvenido a ContentAI',
    'login.subtitle': 'Tu agencia de contenido potenciada por IA',
    'login.email': 'Correo electrónico',
    'login.password': 'Contraseña',
    'login.submit': 'Iniciar sesión',
    'login.no_account': '¿No tienes cuenta?',
    'login.register': 'Regístrate',
    'login.have_account': '¿Ya tienes cuenta?',
    'login.login': 'Inicia sesión',
    'login.name': 'Nombre completo',
    'login.org_name': 'Nombre de la agencia',
    'login.register_submit': 'Crear cuenta',
    'generate.title': 'Generar Contenido',
    'generate.subtitle': 'Creá contenido con IA para tus clientes',
    'generate.client': 'Cliente',
    'generate.client_placeholder': 'Seleccioná un cliente',
    'generate.brief': 'Brief / Prompt',
    'generate.brief_placeholder': 'Ej: [Contexto] Habla sobre los 3 errores más comunes en Meta Ads hoy. [Objetivo] Invitarlos a agendar la auditoría gratuita.',
    'generate.ai_idea': 'Dame una idea (Asistente AI)',
    'generate.thinking': '✨ Pensando...',
    'generate.tips': '💡 Tips para un mejor resultado:',
    'generate.quantity': 'Cantidad por tipo',
    'generate.total_pieces': 'Total piezas',
    'generate.submit': 'Generar {count} piezas',
    'generate.brand_context': 'Contexto de marca',
    'generate.generating_title': 'Generando contenido...',
    'generate.generating_subtitle': 'IA trabajando con el brief para {name}',
    'generate.results_title': 'Contenido Generado',
    'generate.pieces_ready': '{count} piezas listas',
    'generate.approve': 'Aprobar',
    'generate.reject': 'Rechazar',
    'generate.schedule': 'Programar',
    'generate.image_prompt': 'Prompt de imagen (editable)',
    'generate.generate_image': 'Generar imagen con Gemini',
    'generate.regenerate': 'Regenerar',
    'generate.generate_video': 'Generar video con avatar',
    'generate.video_processing': 'Generando video con avatar...',
    'generate.empty_title': 'Listo para crear',
    'generate.empty_subtitle': 'Seleccioná un cliente, escribí un brief y elegí cuántas piezas generar. La IA se encarga del resto.',
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Vista general de tu plataforma de contenido',
    'dashboard.clients': 'Clientes',
    'dashboard.active': 'activos',
    'dashboard.monthly_pieces': 'Piezas este mes',
    'dashboard.total_pieces': '{count} total',
    'dashboard.tokens_usage': 'Uso Tokens',
    'dashboard.budget_used': 'presupuesto usado',
    'dashboard.monthly_spend': 'Gasto del mes',
    'dashboard.api_calls': '{count} llamadas',
    'dashboard.recent_requests': 'Requests Recientes',
    'dashboard.last_pieces': 'Últimas Piezas Generadas',
    'dashboard.no_requests': 'No hay requests recientes',
    'dashboard.no_pieces': 'No hay piezas generadas',
    'dashboard.no_clients': 'No hay clientes registrados',
    'dashboard.delete_request': '¿Eliminar esta solicitud? Se borrarán todas sus piezas generadas.',
    'dashboard.tokens_limit': '{limit} límite',
    'dashboard.tokens_used_stats': '{used} usados',
    'dashboard.pieces_label': 'piezas',
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.clients': 'Clients',
    'nav.generate': 'Generate',
    'nav.content': 'Content',
    'nav.calendar': 'Calendar',
    'nav.analytics': 'Analytics',
    'nav.settings': 'Settings',
    'nav.system_status': 'System Status',
    'nav.menu': 'Menu',
    'nav.logout': 'Logout',
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.tokens': 'tokens',
    'common.plan': 'Plan',
    'common.ai': 'AI',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.ready': 'Ready',
    'common.back': 'Back',
    'common.total': 'Total',
    'sidebar.agency_platform': 'Agency Platform',
    'login.title': 'Welcome to ContentAI',
    'login.subtitle': 'Your AI-powered content agency',
    'login.email': 'Email address',
    'login.password': 'Password',
    'login.submit': 'Log in',
    'login.no_account': "Don't have an account?",
    'login.register': 'Register',
    'login.have_account': 'Already have an account?',
    'login.login': 'Log in',
    'login.name': 'Full Name',
    'login.org_name': 'Agency Name',
    'login.register_submit': 'Create account',
    'generate.title': 'Generate Content',
    'generate.subtitle': 'Create AI content for your clients',
    'generate.client': 'Client',
    'generate.client_placeholder': 'Select a client',
    'generate.brief': 'Brief / Prompt',
    'generate.brief_placeholder': 'e.g. [Context] Talk about the 3 most common errors in Meta Ads today. [Goal] Invite them to book a free audit.',
    'generate.ai_idea': 'Give me an idea (AI Assistant)',
    'generate.thinking': '✨ Thinking...',
    'generate.tips': '💡 Tips for a better result:',
    'generate.quantity': 'Quantity per type',
    'generate.total_pieces': 'Total pieces',
    'generate.submit': 'Generate {count} pieces',
    'generate.brand_context': 'Brand Context',
    'generate.generating_title': 'Generating content...',
    'generate.generating_subtitle': 'AI working with the brief for {name}',
    'generate.results_title': 'Generated Content',
    'generate.pieces_ready': '{count} pieces ready',
    'generate.approve': 'Approve',
    'generate.reject': 'Reject',
    'generate.schedule': 'Schedule',
    'generate.image_prompt': 'Image prompt (editable)',
    'generate.generate_image': 'Generate image with Gemini',
    'generate.regenerate': 'Regenerate',
    'generate.generate_video': 'Generate avatar video',
    'generate.video_processing': 'Generating avatar video...',
    'generate.empty_title': 'Ready to create',
    'generate.empty_subtitle': 'Select a client, write a brief, and choose how many pieces to generate. AI does the rest.',
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Overview of your content platform',
    'dashboard.clients': 'Clients',
    'dashboard.active': 'active',
    'dashboard.monthly_pieces': 'Pieces this month',
    'dashboard.total_pieces': '{count} total',
    'dashboard.tokens_usage': 'Tokens Usage',
    'dashboard.budget_used': 'budget used',
    'dashboard.monthly_spend': 'Monthly Spend',
    'dashboard.api_calls': '{count} calls',
    'dashboard.recent_requests': 'Recent Requests',
    'dashboard.last_pieces': 'Latest Generated Pieces',
    'dashboard.no_requests': 'No recent requests',
    'dashboard.no_pieces': 'No pieces generated',
    'dashboard.no_clients': 'No clients registered',
    'dashboard.delete_request': 'Delete this request? All its generated pieces will be deleted.',
    'dashboard.tokens_limit': '{limit} limit',
    'dashboard.tokens_used_stats': '{used} used',
    'dashboard.pieces_label': 'pieces',
  }
};

interface I18nContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextProps | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('es');

  useEffect(() => {
    const saved = localStorage.getItem('contentai_lang') as Language;
    if (saved && (saved === 'es' || saved === 'en')) {
      setLanguage(saved);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('contentai_lang', lang);
  };

  const t = (key: string, replacements?: Record<string, string | number>) => {
    let text = translations[language][key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v.toString());
      });
    }
    return text;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
