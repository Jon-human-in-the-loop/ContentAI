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
  // Opus family
  OPUS_4_7:    'claude-opus-4-7',
  OPUS_4:      'claude-opus-4',

  // Sonnet family
  SONNET_4:    'claude-sonnet-4',
  SONNET_3_7:  'claude-sonnet-3-7',

  // Haiku family
  HAIKU_3_5:   'claude-haiku-3-5',
  HAIKU_3:     'claude-haiku-3',

  // Aliases for the default routing
  PREMIUM: 'claude-sonnet-4',
  LITE:    'claude-haiku-3-5',
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
 * Opus 4/4.7: $5.00 / $25.00
 * Sonnet 3.7/4: $3.00 / $15.00
 * Haiku 3.5: $0.80 / $4.00
 * Haiku 3: $0.25 / $1.25
 */
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // Opus family
  [AI_MODELS.OPUS_4_7]:   { input: 5.00,  output: 25.00 },
  [AI_MODELS.OPUS_4]:     { input: 5.00,  output: 25.00 },

  // Sonnet family
  [AI_MODELS.SONNET_4]:   { input: 3.00,  output: 15.00 },
  [AI_MODELS.SONNET_3_7]: { input: 3.00,  output: 15.00 },

  // Haiku family
  [AI_MODELS.HAIKU_3_5]:  { input: 0.80,  output: 4.00  },
  [AI_MODELS.HAIKU_3]:    { input: 0.25,  output: 1.25  },
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
