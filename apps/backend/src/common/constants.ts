// Queue names
export const QUEUES = {
  CONTENT_GENERATE: 'content:generate',
  CONTENT_REFINE: 'content:refine',
  CONTENT_HASHTAGS: 'content:hashtags',
  CONTENT_VISUAL: 'content:visual',
  PUBLISH_EXECUTE: 'publish:execute',
  PUBLISH_SCHEDULE: 'publish:schedule',
} as const;

// AI Model configuration
export const AI_MODELS = {
  PREMIUM: 'claude-sonnet-4-20250514',
  LITE: 'claude-haiku-4-5-20251001',
} as const;

// Task-to-model routing
export const TASK_MODEL_MAP: Record<string, string> = {
  // Premium model tasks (creative, complex)
  'generate:post:caption': AI_MODELS.PREMIUM,
  'generate:reel:script': AI_MODELS.PREMIUM,
  'generate:story:creative': AI_MODELS.PREMIUM,
  'generate:carousel:narrative': AI_MODELS.PREMIUM,

  // Lite model tasks (repetitive, simple)
  'generate:hashtags': AI_MODELS.LITE,
  'generate:visual_prompt': AI_MODELS.LITE,
  'generate:variation': AI_MODELS.LITE,
  'generate:adaptation': AI_MODELS.LITE,
  'generate:translation': AI_MODELS.LITE,
  'validate:brand_voice': AI_MODELS.LITE,
} as const;

// Cost per 1M tokens (USD)
export const MODEL_COSTS = {
  [AI_MODELS.PREMIUM]: { input: 3.0, output: 15.0 },
  [AI_MODELS.LITE]: { input: 0.8, output: 4.0 },
} as const;

// Cache TTLs (seconds)
export const CACHE_TTL = {
  EXACT_MATCH: 86400,     // 24 hours
  SEMANTIC_MATCH: 604800,  // 7 days
  BRAND_PROFILE: 3600,     // 1 hour
} as const;
