export interface Client {
  id: string;
  name: string;
  industry: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  toneOfVoice: string;
  totalPieces: number;
  platforms: string[];
}

export interface ContentPiece {
  id: string;
  clientId: string;
  clientName: string;
  type: 'POST' | 'REEL' | 'STORY' | 'CAROUSEL';
  platform: string;
  status: 'GENERATING' | 'DRAFT' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'REJECTED';
  caption: string;
  hashtags: string[];
  hook: string;
  cta: string;
  script?: string;
  modelUsed: string;
  generationCost: number;
  createdAt: string;
  scheduledAt?: string;
}

export interface ContentRequest {
  id: string;
  clientId: string;
  clientName: string;
  brief: string;
  contentTypes: Record<string, number>;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalPieces: number;
  completedPieces: number;
  createdAt: string;
}

export const mockClients: Client[] = [
  {
    id: 'c1', name: 'Verde Orgánico', industry: 'Restaurante',
    logoUrl: '', primaryColor: '#2d6a4f', secondaryColor: '#95d5b2',
    toneOfVoice: 'Cercano, natural, apasionado por lo orgánico',
    totalPieces: 48, platforms: ['INSTAGRAM', 'FACEBOOK'],
  },
  {
    id: 'c2', name: 'FitZone Gym', industry: 'Fitness',
    logoUrl: '', primaryColor: '#e63946', secondaryColor: '#f1faee',
    toneOfVoice: 'Motivador, energético, directo',
    totalPieces: 62, platforms: ['INSTAGRAM', 'TIKTOK'],
  },
  {
    id: 'c3', name: 'Código Legal', industry: 'Abogados',
    logoUrl: '', primaryColor: '#1d3557', secondaryColor: '#a8dadc',
    toneOfVoice: 'Profesional, confiable, accesible',
    totalPieces: 31, platforms: ['LINKEDIN', 'INSTAGRAM'],
  },
  {
    id: 'c4', name: 'PetLove Shop', industry: 'Tienda de mascotas',
    logoUrl: '', primaryColor: '#f4a261', secondaryColor: '#264653',
    toneOfVoice: 'Tierno, divertido, emocional',
    totalPieces: 55, platforms: ['INSTAGRAM', 'FACEBOOK', 'TIKTOK'],
  },
  {
    id: 'c5', name: 'TechVault', industry: 'Tecnología',
    logoUrl: '', primaryColor: '#6c63ff', secondaryColor: '#f0efff',
    toneOfVoice: 'Innovador, técnico pero accesible',
    totalPieces: 27, platforms: ['LINKEDIN', 'X'],
  },
  {
    id: 'c6', name: 'Bella Donna Spa', industry: 'Belleza & Spa',
    logoUrl: '', primaryColor: '#bc6c8a', secondaryColor: '#fdf2f8',
    toneOfVoice: 'Elegante, relajante, lujoso',
    totalPieces: 43, platforms: ['INSTAGRAM'],
  },
];

export const mockPieces: ContentPiece[] = [
  {
    id: 'p1', clientId: 'c1', clientName: 'Verde Orgánico', type: 'POST',
    platform: 'INSTAGRAM', status: 'APPROVED',
    caption: '¿Sabías que nuestras ensaladas usan ingredientes 100% orgánicos cultivados por productores locales? Cada plato que servimos apoya a más de 15 familias agricultoras de la región 🌱🥗',
    hashtags: ['organico', 'comidasaludable', 'productolocal', 'restaurante', 'sustentable'],
    hook: '¿Sabías que nuestras ensaladas usan ingredientes 100% orgánicos?',
    cta: 'Reservá tu mesa y probá la diferencia →',
    modelUsed: 'claude-sonnet-4-20250514', generationCost: 0.0045,
    createdAt: '2026-03-08T14:30:00Z', scheduledAt: '2026-03-11T12:00:00Z',
  },
  {
    id: 'p2', clientId: 'c2', clientName: 'FitZone Gym', type: 'REEL',
    platform: 'INSTAGRAM', status: 'DRAFT',
    caption: '💪 3 ejercicios que NADIE te enseñó para quemar grasa en 15 minutos',
    hashtags: ['fitness', 'gym', 'workout', 'entrenamiento', 'quemargrasa'],
    hook: 'Pará todo. Estos 3 ejercicios van a cambiar tu rutina.',
    cta: '¿Querés la rutina completa? Link en bio 🔥',
    script: '[00:00] Hook - Primer plano cámara, texto: "3 ejercicios que nadie te enseñó"\n[00:03] Ejercicio 1 - Demo con música energética\n[00:10] Ejercicio 2 - Transición dinámica\n[00:17] Ejercicio 3 - Cámara lenta en el último rep\n[00:25] CTA - "Link en bio para la rutina completa"',
    modelUsed: 'claude-sonnet-4-20250514', generationCost: 0.0062,
    createdAt: '2026-03-08T15:00:00Z',
  },
  {
    id: 'p3', clientId: 'c1', clientName: 'Verde Orgánico', type: 'STORY',
    platform: 'INSTAGRAM', status: 'SCHEDULED',
    caption: '🌿 Hoy llegó la cosecha fresca. ¡Mirá lo que preparamos!',
    hashtags: ['freshfood', 'organico'],
    hook: '🌿 Acaba de llegar...',
    cta: 'Deslizá para ver el menú del día →',
    modelUsed: 'claude-haiku-4-5-20251001', generationCost: 0.0008,
    createdAt: '2026-03-07T10:00:00Z', scheduledAt: '2026-03-10T09:00:00Z',
  },
  {
    id: 'p4', clientId: 'c3', clientName: 'Código Legal', type: 'POST',
    platform: 'LINKEDIN', status: 'PUBLISHED',
    caption: '¿Sabés qué hacer si te llega una notificación judicial? Muchos cometen el error de ignorarla. Acá te explicamos los 5 pasos que tenés que seguir para proteger tus derechos.',
    hashtags: ['derecho', 'abogados', 'consejolegal', 'derechos'],
    hook: '¿Sabés qué hacer si te llega una notificación judicial?',
    cta: 'Agendá una consulta gratuita — link en bio',
    modelUsed: 'claude-sonnet-4-20250514', generationCost: 0.0051,
    createdAt: '2026-03-06T09:00:00Z',
  },
  {
    id: 'p5', clientId: 'c4', clientName: 'PetLove Shop', type: 'REEL',
    platform: 'TIKTOK', status: 'DRAFT',
    caption: '😂 POV: Tu perro cuando escucha la palabra "paseo"',
    hashtags: ['perros', 'mascotas', 'dogs', 'petlover', 'humor'],
    hook: 'POV: Le dijiste "paseo" a tu perro...',
    cta: '¿El tuyo también hace esto? Comentá 👇',
    script: '[00:00] Dueño sentado en el sillón, dice "paseo"\n[00:02] Corte a perro con cara de sorpresa\n[00:04] Perro corre por toda la casa\n[00:08] Perro trae la correa\n[00:12] Texto: "Cada. Vez."',
    modelUsed: 'claude-sonnet-4-20250514', generationCost: 0.0055,
    createdAt: '2026-03-08T16:00:00Z',
  },
  {
    id: 'p6', clientId: 'c5', clientName: 'TechVault', type: 'POST',
    platform: 'LINKEDIN', status: 'APPROVED',
    caption: 'El 73% de las empresas que adoptan IA reportan un aumento en productividad del 40%. Pero la clave no está en la herramienta, sino en cómo se implementa. En TechVault ayudamos a empresas a integrar IA de forma estratégica.',
    hashtags: ['IA', 'inteligenciaartificial', 'tecnologia', 'productividad', 'transformaciondigital'],
    hook: 'El 73% de las empresas que adoptan IA reportan un aumento en productividad',
    cta: 'Agendá una demo gratuita →',
    modelUsed: 'claude-sonnet-4-20250514', generationCost: 0.0048,
    createdAt: '2026-03-07T11:00:00Z', scheduledAt: '2026-03-12T10:00:00Z',
  },
  {
    id: 'p7', clientId: 'c6', clientName: 'Bella Donna Spa', type: 'STORY',
    platform: 'INSTAGRAM', status: 'GENERATING',
    caption: '', hashtags: [], hook: '', cta: '',
    modelUsed: '', generationCost: 0,
    createdAt: '2026-03-09T08:00:00Z',
  },
  {
    id: 'p8', clientId: 'c2', clientName: 'FitZone Gym', type: 'POST',
    platform: 'INSTAGRAM', status: 'APPROVED',
    caption: 'No necesitás 2 horas en el gym. Con 45 minutos y la rutina correcta, podés transformar tu cuerpo. La clave está en la intensidad, no en la duración. 💪',
    hashtags: ['fitness', 'rutina', 'gym', 'entrenamiento', 'motivacion'],
    hook: 'No necesitás 2 horas en el gym.',
    cta: 'Probá una clase gratis esta semana →',
    modelUsed: 'claude-haiku-4-5-20251001', generationCost: 0.0012,
    createdAt: '2026-03-08T13:00:00Z', scheduledAt: '2026-03-13T18:00:00Z',
  },
];

export const mockRequests: ContentRequest[] = [
  {
    id: 'r1', clientId: 'c1', clientName: 'Verde Orgánico',
    brief: 'Crear contenido sobre la nueva cosecha de temporada y el menú especial de otoño',
    contentTypes: { POST: 3, STORY: 2, REEL: 1 },
    status: 'COMPLETED', totalPieces: 6, completedPieces: 6,
    createdAt: '2026-03-07T10:00:00Z',
  },
  {
    id: 'r2', clientId: 'c2', clientName: 'FitZone Gym',
    brief: 'Campaña de captación para nuevo mes. Ejercicios rápidos y promoción de clases grupales',
    contentTypes: { POST: 2, REEL: 2 },
    status: 'COMPLETED', totalPieces: 4, completedPieces: 4,
    createdAt: '2026-03-08T14:00:00Z',
  },
  {
    id: 'r3', clientId: 'c6', clientName: 'Bella Donna Spa',
    brief: 'Promoción de tratamientos faciales de primavera y nuevo servicio de masajes con piedras',
    contentTypes: { POST: 2, STORY: 3 },
    status: 'PROCESSING', totalPieces: 5, completedPieces: 3,
    createdAt: '2026-03-09T08:00:00Z',
  },
];

export const mockAnalytics = {
  overview: {
    totalClients: 6,
    totalPieces: 266,
    monthlyPieces: 47,
    plan: 'PRO',
  },
  costs: {
    monthlySpend: 12.84,
    totalTokens: 2847000,
    apiCalls: 312,
    tokenBudget: {
      limit: 5000000,
      used: 2847000,
      remaining: 2153000,
      usagePercent: 56.9,
    },
  },
  dailyCosts: [
    { date: '2026-03-03', cost: 1.82, requests: 38 },
    { date: '2026-03-04', cost: 2.15, requests: 45 },
    { date: '2026-03-05', cost: 1.67, requests: 35 },
    { date: '2026-03-06', cost: 2.43, requests: 51 },
    { date: '2026-03-07', cost: 1.98, requests: 42 },
    { date: '2026-03-08', cost: 2.31, requests: 48 },
    { date: '2026-03-09', cost: 0.48, requests: 12 },
  ],
  modelBreakdown: [
    { model: 'Sonnet', requests: 156, cost: 9.24, percentage: 72 },
    { model: 'Haiku', requests: 126, cost: 1.89, percentage: 15 },
    { model: 'Cache', requests: 30, cost: 0, percentage: 0 },
  ],
  cacheHitRate: 18.4,
};

export const calendarEvents: Record<string, ContentPiece[]> = {
  '2026-03-10': [mockPieces[2]],
  '2026-03-11': [mockPieces[0]],
  '2026-03-12': [mockPieces[5]],
  '2026-03-13': [mockPieces[7]],
};
