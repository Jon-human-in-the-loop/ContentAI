// Queue names
export const QUEUES = {
  CONTENT_GENERATE: 'content_generate',
  CONTENT_REFINE: 'content_refine',
  CONTENT_HASHTAGS: 'content_hashtags',
  CONTENT_VISUAL: 'content_visual',
  PUBLISH_EXECUTE: 'publish_execute',
  PUBLISH_SCHEDULE: 'publish_schedule',
} as const;

// AI Model IDs (Anthropic versioned identifiers)
export const AI_MODELS = {
  // Haiku family
  HAIKU_3_5:   'claude-3-5-haiku-20241022',
  HAIKU_3_7:   'claude-3-7-haiku-20251101',

  // Sonnet family
  SONNET_3_5:  'claude-3-5-sonnet-20240620',
  SONNET_3_7:  'claude-3-7-sonnet-20260210',

  // Opus family
  OPUS_4_7:    'claude-4-7-opus-20260420',

  // Aliases for the default routing
  PREMIUM: 'claude-3-7-sonnet-20260210',
  LITE:    'claude-3-5-haiku-20241022',
} as const;

// Task-to-model routing (used when org has no preferredModel override)
export const TASK_MODEL_MAP: Record<string, string> = {
  // Premium model tasks (creative, complex)
  'generate:post:caption':       AI_MODELS.PREMIUM,
  'generate:reel:script':        AI_MODELS.PREMIUM,
  'generate:story:creative':     AI_MODELS.PREMIUM,
  'generate:carousel:narrative': AI_MODELS.PREMIUM,

  // Lite model tasks (repetitive, simple)
  'generate:hashtags':      AI_MODELS.LITE,
  'generate:visual_prompt': AI_MODELS.LITE,
  'generate:variation':     AI_MODELS.LITE,
  'generate:adaptation':    AI_MODELS.LITE,
  'generate:translation':   AI_MODELS.LITE,
  'validate:brand_voice':   AI_MODELS.LITE,
} as const;

/**
 * Cost per 1M tokens (USD) — Anthropic official pricing May 2026
 *
 * Haiku 3.5:   $0.80 / $4.00
 * Haiku 3.7:   $1.00 / $5.00
 * Sonnet 3.5/3.7: $3.00 / $15.00
 * Opus 4.7:    $5.00 / $25.00
 */
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // Haiku family
  [AI_MODELS.HAIKU_3_5]: { input: 0.80,  output: 4.00  },
  [AI_MODELS.HAIKU_3_7]: { input: 1.00,  output: 5.00  },

  // Sonnet family
  [AI_MODELS.SONNET_3_5]: { input: 3.00, output: 15.00 },
  [AI_MODELS.SONNET_3_7]: { input: 3.00, output: 15.00 },

  // Opus family
  [AI_MODELS.OPUS_4_7]:   { input: 5.00,  output: 25.00 },
};

/**
 * Fallback cost when model ID is not in MODEL_COSTS
 * Uses Sonnet pricing as a safe middle ground
 */
export const DEFAULT_MODEL_COST = { input: 3.00, output: 15.00 };

// Cache TTLs (seconds)
export const CACHE_TTL = {
  EXACT_MATCH: 86400,     // 24 hours
  SEMANTIC_MATCH: 604800,  // 7 days
  BRAND_PROFILE: 3600,     // 1 hour
} as const;
