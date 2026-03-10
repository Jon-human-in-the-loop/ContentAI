# ContentAI — Arquitectura del Sistema

## Visión General

ContentAI es una plataforma SaaS de generación de contenido con IA para agencias que gestionan múltiples cuentas de redes sociales. Está diseñada para escalar a 100+ clientes con costos de API controlados.

---

## 1. Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
│  Dashboard │ Clients │ Content Editor │ Calendar │ Analytics    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST/GraphQL + WebSockets
┌──────────────────────────▼──────────────────────────────────────┐
│                     API GATEWAY (NestJS)                         │
│  Auth │ Rate Limiting │ Tenant Resolution │ Request Validation  │
└───┬──────────┬──────────┬──────────┬──────────┬────────────────┘
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────────┐
│ Client │ │Content │ │ Queue  │ │Calendar│ │  Publishing    │
│ Module │ │ Module │ │ Module │ │ Module │ │  Module        │
└────┬───┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────────────┘
     │         │          │          │            │
     ▼         ▼          ▼          ▼            ▼
┌──────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                 │
│  PostgreSQL │ Redis (Cache + Queues) │ S3/R2 (Assets)        │
└──────────────────────────────────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │    WORKER CLUSTER       │
              │  BullMQ Workers         │
              │  ┌─────────────────┐    │
              │  │ AI Orchestrator │    │
              │  │  ┌───────────┐  │    │
              │  │  │ Router    │  │    │
              │  │  │ (decide   │  │    │
              │  │  │  model)   │  │    │
              │  │  └─────┬─────┘  │    │
              │  │    ┌───┴───┐    │    │
              │  │    ▼       ▼    │    │
              │  │ Premium  Lite  │    │
              │  │ (Claude  (Haiku│    │
              │  │  Sonnet) etc.) │    │
              │  └─────────────────┘    │
              └─────────────────────────┘
```

---

## 2. Módulos del Backend (NestJS)

### 2.1 Auth Module
- JWT + Refresh Tokens
- Roles: `owner`, `admin`, `editor`, `viewer`
- Multi-tenancy por organización (agencia)

### 2.2 Clients Module
- CRUD de clientes con perfil de marca
- Upload de logos y assets a S3/R2
- Brand voice profile (tono, estilo, keywords, prohibiciones)

### 2.3 Content Module
- Recibe briefs/prompts del usuario
- Crea ContentRequest con metadata
- Enqueue a BullMQ para procesamiento async
- Endpoints para listar, editar, aprobar, rechazar contenido

### 2.4 Generation Module (Workers)
- Consume jobs de BullMQ
- AI Router: decide qué modelo usar según la tarea
- Pipeline de generación con etapas
- Manejo de reintentos y fallbacks

### 2.5 Template Module
- Plantillas visuales por tipo (post, reel, story)
- Vinculadas a clientes o globales
- Parámetros configurables (colores, fonts, layout)

### 2.6 Calendar Module
- Vista de calendario por cliente o global
- Programación de contenido (fecha/hora)
- Estados: draft → scheduled → published → archived

### 2.7 Publishing Module
- Conectores para APIs de redes sociales
- Meta Graph API (Instagram, Facebook)
- TikTok API, LinkedIn API, X API
- Cola de publicación con reintentos

### 2.8 Analytics Module
- Tracking de uso de API (tokens, costo)
- Métricas por cliente (contenido generado, publicado)
- Dashboard de costos

---

## 3. Esquema de Base de Datos (PostgreSQL)

```sql
-- ============================================
-- MULTI-TENANCY
-- ============================================

CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    plan            VARCHAR(50) DEFAULT 'starter', -- starter, pro, enterprise
    monthly_token_limit BIGINT DEFAULT 1000000,
    tokens_used     BIGINT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    role            VARCHAR(50) DEFAULT 'editor', -- owner, admin, editor, viewer
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GESTIÓN DE CLIENTES
-- ============================================

CREATE TABLE clients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    industry        VARCHAR(100),          -- rubro
    description     TEXT,
    logo_url        VARCHAR(500),
    website         VARCHAR(500),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE client_branding (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
    primary_color   VARCHAR(7),            -- #HEX
    secondary_color VARCHAR(7),
    accent_color    VARCHAR(7),
    font_primary    VARCHAR(100),
    font_secondary  VARCHAR(100),
    tone_of_voice   TEXT,                  -- descripción del tono
    style_keywords  TEXT[],                -- array de keywords
    prohibitions    TEXT[],                -- palabras/temas prohibidos
    sample_content  TEXT,                  -- ejemplos de contenido aprobado
    brand_guidelines_url VARCHAR(500)
);

CREATE TABLE client_social_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
    platform        VARCHAR(50) NOT NULL,  -- instagram, facebook, tiktok, linkedin, x
    account_id      VARCHAR(255),
    account_name    VARCHAR(255),
    access_token    TEXT,                  -- encrypted
    refresh_token   TEXT,                  -- encrypted
    token_expires_at TIMESTAMPTZ,
    connected_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEMPLATES
-- ============================================

CREATE TABLE templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
    client_id       UUID REFERENCES clients(id) ON DELETE SET NULL, -- NULL = global
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(50) NOT NULL,  -- post, reel, story
    platform        VARCHAR(50),           -- instagram, facebook, etc.
    canvas_data     JSONB,                 -- configuración visual
    thumbnail_url   VARCHAR(500),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GENERACIÓN DE CONTENIDO
-- ============================================

CREATE TABLE content_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
    client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id),
    brief           TEXT NOT NULL,          -- prompt del usuario
    content_types   JSONB NOT NULL,         -- {"post": 3, "reel": 2, "story": 1}
    platforms       TEXT[],
    template_ids    UUID[],
    status          VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    total_pieces    INT DEFAULT 0,
    completed_pieces INT DEFAULT 0,
    estimated_cost  DECIMAL(10,4),
    actual_cost     DECIMAL(10,4),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE TABLE content_pieces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id      UUID REFERENCES content_requests(id) ON DELETE CASCADE,
    client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
    org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,  -- post, reel, story
    platform        VARCHAR(50),
    status          VARCHAR(50) DEFAULT 'generating', -- generating, draft, approved, scheduled, published, rejected
    
    -- Contenido generado
    caption         TEXT,
    hashtags        TEXT[],
    visual_prompt   TEXT,                  -- prompt para generar imagen
    script          TEXT,                  -- para reels
    hook            TEXT,                  -- gancho inicial
    cta             TEXT,                  -- call to action
    
    -- Metadata de generación
    model_used      VARCHAR(100),          -- claude-sonnet-4-20250514, claude-haiku, etc.
    tokens_input    INT,
    tokens_output   INT,
    generation_cost DECIMAL(10,4),
    generation_time_ms INT,
    
    -- Programación
    scheduled_at    TIMESTAMPTZ,
    published_at    TIMESTAMPTZ,
    publish_result  JSONB,                 -- respuesta de la API social
    
    -- Versionado
    version         INT DEFAULT 1,
    parent_id       UUID REFERENCES content_pieces(id),
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CACHÉ DE IA
-- ============================================

CREATE TABLE ai_cache (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key       VARCHAR(64) NOT NULL,  -- SHA-256 del prompt normalizado
    model           VARCHAR(100),
    prompt_hash     VARCHAR(64),
    response        TEXT NOT NULL,
    tokens_saved    INT,
    hit_count       INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    UNIQUE(cache_key, model)
);

CREATE INDEX idx_ai_cache_key ON ai_cache(cache_key);
CREATE INDEX idx_ai_cache_expires ON ai_cache(expires_at);

-- ============================================
-- TRACKING DE COSTOS
-- ============================================

CREATE TABLE api_usage_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES organizations(id),
    model           VARCHAR(100) NOT NULL,
    tokens_input    INT NOT NULL,
    tokens_output   INT NOT NULL,
    cost            DECIMAL(10,6) NOT NULL,
    task_type       VARCHAR(50),           -- generation, refinement, hashtag, etc.
    content_piece_id UUID REFERENCES content_pieces(id),
    cached          BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_org_date ON api_usage_log(org_id, created_at);

-- ============================================
-- CALENDARIO Y PUBLICACIÓN
-- ============================================

CREATE TABLE publish_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_piece_id UUID REFERENCES content_pieces(id),
    platform        VARCHAR(50) NOT NULL,
    social_account_id UUID REFERENCES client_social_accounts(id),
    scheduled_at    TIMESTAMPTZ NOT NULL,
    status          VARCHAR(50) DEFAULT 'queued', -- queued, publishing, published, failed
    attempts        INT DEFAULT 0,
    max_attempts    INT DEFAULT 3,
    last_error      TEXT,
    published_at    TIMESTAMPTZ,
    external_post_id VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_publish_scheduled ON publish_queue(scheduled_at, status);
```

---

## 4. Sistema de Colas y Workers (BullMQ + Redis)

### 4.1 Colas definidas

| Cola | Propósito | Concurrencia | Prioridad |
|------|-----------|-------------|-----------|
| `content:generate` | Generación principal de contenido | 5 workers | Por plan |
| `content:refine` | Refinamiento y variaciones | 3 workers | Normal |
| `content:hashtags` | Generación de hashtags | 10 workers | Baja |
| `content:visual` | Prompts para imágenes | 3 workers | Normal |
| `publish:execute` | Publicación en redes | 5 workers | Alta |
| `publish:schedule` | Scheduler de publicación | 1 worker | Alta |

### 4.2 Flujo del Worker de Generación

```
ContentRequest llega
    │
    ▼
┌─────────────────────┐
│ Job Splitter         │  Divide el request en sub-jobs
│ {post:3, reel:2}    │  → 5 jobs individuales
└──────────┬──────────┘
           │
    ┌──────▼──────┐
    │ Para cada   │
    │ content type│
    ▼             │
┌──────────────┐  │
│ Build Context│  │  Ensambla: brand voice + brief + tipo + ejemplos
└──────┬───────┘  │
       │          │
       ▼          │
┌──────────────┐  │
│ Check Cache  │──┤  ¿Hay resultado similar cacheado?
└──────┬───────┘  │  → Sí: adaptar resultado existente (modelo lite)
       │ No       │  → No: continuar generación completa
       ▼          │
┌──────────────┐  │
│ AI Router    │  │  Decide qué modelo usar según task_type
└──────┬───────┘  │
       │          │
       ▼          │
┌──────────────┐  │
│ Generate     │  │  Llama al modelo de IA
└──────┬───────┘  │
       │          │
       ▼          │
┌──────────────┐  │
│ Post-Process │  │  Hashtags (lite), formateo, validación
└──────┬───────┘  │
       │          │
       ▼          │
┌──────────────┐  │
│ Save + Cache │──┘  Guarda resultado y actualiza caché
└──────────────┘
```

### 4.3 Configuración de BullMQ

```typescript
// Cola principal de generación
const generationQueue = new Queue('content:generate', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

// Worker con rate limiting
const worker = new Worker('content:generate', processGeneration, {
  connection: redisConnection,
  concurrency: 5,
  limiter: {
    max: 50,        // máximo 50 jobs
    duration: 60000, // por minuto (rate limit de API)
  },
});
```

---

## 5. Estrategia de Reducción de Costos de API

### 5.1 Modelo de Routing por Tarea

| Tarea | Modelo | Costo Relativo | Justificación |
|-------|--------|---------------|---------------|
| Generación de caption creativo | Claude Sonnet | $$$ | Requiere creatividad y tono de marca |
| Guiones de reels | Claude Sonnet | $$$ | Estructura narrativa compleja |
| Generación de hashtags | Claude Haiku | $ | Tarea repetitiva y simple |
| Adaptación de contenido (resize) | Claude Haiku | $ | Solo reformatear |
| Traducción de contenido | Claude Haiku | $ | Tarea mecánica |
| Variaciones de un post aprobado | Claude Haiku | $ | Base ya existente |
| Visual prompts para imágenes | Claude Haiku | $ | Descriptivo, no creativo |
| Revisión de tono de marca | Claude Haiku | $ | Validación binaria |

### 5.2 Sistema de Caché Multi-Nivel

```
Nivel 1: Caché Exacto (Redis)
    └─ Hash del prompt exacto → resultado
    └─ TTL: 24 horas
    └─ Hit rate esperado: 15-20%

Nivel 2: Caché Semántico (PostgreSQL)
    └─ Prompts similares del mismo cliente/rubro
    └─ Búsqueda por similarity de embeddings
    └─ Resultado: se adapta con modelo lite
    └─ Ahorro: ~60% vs generación completa

Nivel 3: Templates Pre-generados
    └─ Contenido base por rubro (restaurante, gym, etc.)
    └─ Se personaliza con datos del cliente
    └─ Modelo lite para personalización
    └─ Ahorro: ~80% vs generación completa
```

### 5.3 Técnicas Adicionales de Ahorro

1. **Batch Processing**: Agrupar requests del mismo cliente para compartir contexto
2. **Prompt Compression**: Reducir tokens de sistema con instrucciones compactas
3. **Progressive Generation**: Generar 1 pieza y, si se aprueba, generar variaciones con modelo lite
4. **Token Budget por Org**: Límite configurable por organización/plan
5. **Off-peak Processing**: Jobs no urgentes se procesan en horarios de menor carga

### 5.4 Estimación de Costos

```
Escenario: 100 clientes, 20 piezas/semana cada uno

Sin optimización:
  2000 piezas × ~1500 tokens avg × $3/MTok (Sonnet) = ~$9/semana

Con routing + caché:
  - 30% con Sonnet (creativos): 600 × 1500 × $3/MTok = $2.70
  - 50% con Haiku (repetitivos): 1000 × 800 × $0.25/MTok = $0.20
  - 20% desde caché: $0
  Total: ~$2.90/semana (ahorro ~68%)
```

---

## 6. Flujo Completo: Brief → Contenido Generado

```
1. USUARIO → Selecciona cliente + escribe brief
        │
2. FRONTEND → Valida, muestra preview del request
        │
3. API → Crea ContentRequest, valida budget, enqueue
        │
4. QUEUE → Job Splitter divide en sub-jobs por tipo
        │
5. WORKER (por cada pieza):
   a) Carga perfil del cliente (brand voice, colores, tono)
   b) Construye prompt optimizado:
      - System: "Eres un CM experto. Cliente: {brand}. Tono: {tone}"
      - User: "{brief}. Genera un {type} para {platform}"
   c) Consulta caché (exact → semantic → template)
   d) Si caché hit: adapta con modelo lite
   e) Si caché miss: genera con modelo premium
   f) Post-procesa: hashtags (Haiku), formateo, validación
   g) Guarda en DB + actualiza caché
        │
6. WEBSOCKET → Notifica al frontend por cada pieza completada
        │
7. FRONTEND → Muestra resultados en tiempo real
        │
8. USUARIO → Revisa, edita, aprueba o rechaza
        │
9. APROBADO → Se puede programar en calendario
        │
10. SCHEDULER → En la fecha/hora programada, enqueue publicación
        │
11. PUBLISHER → Usa API oficial de la red social para publicar
        │
12. RESULTADO → Se guarda external_post_id, se marca como publicado
```

---

## 7. Roadmap: MVP → SaaS Escalable

### Fase 1: Fundaciones (Semanas 1-3)
- [ ] Migrar a NestJS con estructura modular
- [ ] Implementar PostgreSQL con esquema completo
- [ ] Setup Redis + BullMQ
- [ ] Auth con JWT + roles básicos
- [ ] Multi-tenancy por organización

### Fase 2: Generación Inteligente (Semanas 4-6)
- [ ] AI Router (modelo por tipo de tarea)
- [ ] Workers de generación con BullMQ
- [ ] Sistema de caché nivel 1 (exact match)
- [ ] Brand voice profiles por cliente
- [ ] Tracking de tokens y costos

### Fase 3: Experiencia de Usuario (Semanas 7-9)
- [ ] Dashboard con métricas
- [ ] Editor de contenido generado
- [ ] Vista de calendario
- [ ] Notificaciones en tiempo real (WebSockets)
- [ ] Templates visuales

### Fase 4: Publicación (Semanas 10-12)
- [ ] Integración Meta Graph API (IG + FB)
- [ ] Cola de publicación programada
- [ ] Preview de posts antes de publicar
- [ ] Manejo de errores y reintentos

### Fase 5: Escala (Semanas 13-16)
- [ ] Caché semántico (nivel 2)
- [ ] Templates pre-generados por rubro (nivel 3)
- [ ] Rate limiting por organización
- [ ] Horizontal scaling de workers
- [ ] Monitoring y alertas (costos, errores)

### Fase 6: Enterprise (Semanas 17-20)
- [ ] API pública para integraciones
- [ ] White-label capabilities
- [ ] Integración con más redes sociales
- [ ] Analytics avanzados
- [ ] Billing y planes de suscripción
