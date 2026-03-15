# ContentAI — Manual de Producción

## 📋 Tabla de Contenidos

1. [Arquitectura General](#arquitectura-general)
2. [Flujo de Usuario End-to-End](#flujo-de-usuario-end-to-end)
3. [Componentes Implementados](#componentes-implementados)
4. [Lo Que Falta para Producción](#lo-que-falta-para-producción)
5. [Configuración de Producción](#configuración-de-producción)
6. [Deployment](#deployment)

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                      │
│  ├─ ClientsPage (gestión de clientes + Brand Notebook)     │
│  ├─ GeneratePage (generar contenido + imágenes + videos)    │
│  ├─ ContentPage (listar piezas + Aprobar + Programar)       │
│  ├─ CalendarPage (visualizar calendario de publicaciones)   │
│  └─ SettingsPage (conectar redes sociales)                  │
└─────────────────────────────────────────────────────────────┘
                            ↕
                   (HTTP + JWT tokens)
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (NestJS)                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Módulos principales:                                 │  │
│  │ ├─ Clients (CRUD clientes + branding)              │  │
│  │ ├─ Notebook (documentos de marca como contexto)    │  │
│  │ ├─ Generation (generación de contenido con Claude) │  │
│  │ ├─ Content (gestión de piezas)                     │  │
│  │ ├─ Storage (S3/MinIO para imágenes)                │  │
│  │ ├─ Video (Creatify Aurora para videos con avatar)  │  │
│  │ ├─ Publishing (publicación a redes sociales)       │  │
│  │ ├─ Calendar (scheduling de publicaciones)          │  │
│  │ ├─ OAuth (autenticación con redes sociales)        │  │
│  │ └─ Settings (configuración de usuario)             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Infraestructura:                                            │
│  ├─ BullMQ (colas de trabajo)                              │
│  ├─ Redis (cache + colas)                                   │
│  ├─ PostgreSQL (datos persistentes)                        │
│  └─ Prisma ORM                                              │
└─────────────────────────────────────────────────────────────┘
                            ↕
                   (APIs externas)
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   SERVICIOS EXTERNOS                         │
│ ├─ Anthropic Claude (generación de texto + prompts)        │
│ ├─ Google Gemini (generación de imágenes)                  │
│ ├─ Creatify Aurora (generación de videos con avatar)       │
│ ├─ Meta Graph API (Instagram + Facebook)                   │
│ ├─ LinkedIn API (publicación profesional)                  │
│ ├─ X/Twitter API (publicación de tweets)                   │
│ ├─ AWS S3 / MinIO (almacenamiento de medios)               │
│ └─ Google Calendar (sincronización de eventos)             │
└─────────────────────────────────────────────────────────────┘
```

---

## Flujo de Usuario End-to-End

### 1️⃣ Onboarding: Crear Cliente

```
Usuario entra → Settings
  ↓
Conecta redes sociales (OAuth)
  ├─ Instagram/Facebook (Meta)
  ├─ LinkedIn
  ├─ X/Twitter
  └─ TikTok/Threads
  ↓
Clientes → Crear nuevo cliente
  ├─ Datos básicos (nombre, industria, website)
  ├─ Identidad de marca (colores, fuentes)
  ├─ Voz de marca (tono, audiencia, keywords)
  └─ Brand Notebook (agregar notas sobre la marca)
  ↓
Client creado ✓
```

### 2️⃣ Generación de Contenido

```
Generate → Seleccionar cliente
  ↓
Brief (descripción del contenido)
  ↓
Seleccionar tipos de contenido (POST, REEL, STORY, CAROUSEL)
  ↓
Cantidad de variaciones
  ↓
"Generar" → Se añade a BullMQ
  ↓
GenerationWorker procesa:
  1. Carga Brand Notebook (contexto de marca)
  2. Construye prompts con contexto
  3. Llama a Claude API (generación de texto)
  4. Cachea resultados (Redis + PostgreSQL)
  5. Registra costos (API usage logs)
  6. Crea ContentPiece en BD con status DRAFT
  ↓
Frontend muestra piezas generadas
```

### 3️⃣ Edición y Aprobación

```
ContentPage → Mostrar piezas (DRAFT)
  ↓
Usuario puede:
  ├─ Ver contenido (caption, hashtags, hook, CTA)
  ├─ Generar imagen (Gemini) → se almacena en S3
  ├─ Editar texto (caption, hashtags)
  ├─ Generar prompt con Claude
  ├─ Editar el prompt
  ├─ Regenerar imagen (Gemini)
  ├─ Generar video con avatar (Creatify) para REEL/STORY
  └─ Aprobar pieza → status = APPROVED
  ↓
Pieza aprobada ✓
```

### 4️⃣ Programación y Publicación

```
ContentPage → Pieza APPROVED
  ↓
"Programar" → Abre modal de scheduling
  ├─ Seleccionar plataforma (Instagram, Facebook, LinkedIn, X, etc)
  ├─ Seleccionar cuenta conectada (con warning si token vencido)
  ├─ Fecha y hora de publicación
  └─ Confirmar
  ↓
POST /calendar/schedule → Crea PublishQueue (QUEUED)
  ↓
PublishingScheduler corre cada minuto:
  ├─ Busca items en PublishQueue con status QUEUED y scheduledAt <= NOW
  ├─ Añade a BullMQ queue
  ↓
PublishingWorker procesa:
  1. Obtiene ContentPiece + tokens de red social
  2. Llama a API de red social correspondiente
     ├─ Instagram: Meta Graph API (media container + publish)
     ├─ Facebook: Graph API (feed endpoint)
     ├─ LinkedIn: UGC Posts API (texto + imagen)
     ├─ X: API v2 (tweet creation)
     └─ Otros: TikTok, Threads, etc
  3. Registra externalPostId
  4. Actualiza status → PUBLISHED
  ↓
Pieza publicada ✓
```

### 5️⃣ Visualización en Calendario

```
CalendarPage
  ↓
Muestra mes actual con eventos programados
  ├─ Color por tipo (POST=violet, REEL=emerald, STORY=amber)
  ├─ Hoy resaltado
  └─ Puedes ver piezas programadas por día
  ↓
Seleccionar día
  ├─ Ver detalle de piezas
  └─ Desprogramar pieza → DELETE /calendar/schedule/:id → vuelve a APPROVED
```

---

## Componentes Implementados

### ✅ Backend

| Módulo | Estado | Features |
|--------|--------|----------|
| **Clients** | ✅ Completo | CRUD clientes, branding, colores, fonts |
| **Notebook** | ✅ Completo | CRUD notas, categorías, contexto para IA |
| **Generation** | ✅ Completo | Claude API, caching (Redis + PostgreSQL), cost tracking |
| **Content** | ✅ Completo | CRUD piezas, status workflow |
| **Storage** | ✅ Completo | S3/MinIO, upload/download/delete, MediaAsset model |
| **Video** | ✅ Completo | Creatify Aurora API, polling de estado |
| **Publishing** | ✅ Completo | APIs de Instagram, Facebook, LinkedIn, X |
| **Calendar** | ✅ Completo | Scheduling, unscheduling, vista por fecha |
| **OAuth** | ✅ Completo | Instagram/Facebook/LinkedIn/X/TikTok/Threads |
| **Settings** | ✅ Parcial | Gestión de conexiones, Google Calendar |

### ✅ Frontend

| Página | Estado | Features |
|--------|--------|----------|
| **ClientsPage** | ✅ Completo | CRUD clientes, Brand Notebook CRUD |
| **GeneratePage** | ✅ Completo | Generar contenido, imágenes, videos |
| **ContentPage** | ✅ Completo | Listar piezas, Aprobar, modal Programar |
| **CalendarPage** | ✅ Completo | Vista calendario, Desprogramar |
| **SettingsPage** | ✅ Parcial | Conectar redes, mostrar conexiones |

---

## Lo Que Falta para Producción

### 🔴 Crítico (must-have)

#### 1. **Configuración de Variables de Entorno**

Backend necesita:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/contentai

# Redis
REDIS_URL=redis://host:6379

# AI APIs
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...

# Storage (S3/MinIO)
S3_ENDPOINT=https://s3.amazonaws.com          # o http://minio:9000 para MinIO
S3_REGION=us-east-1
S3_BUCKET=contentai-media
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_PUBLIC_URL=https://cdn.example.com         # URL pública para acceder a archivos

# Social Media APIs
META_APP_ID=...
META_APP_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TIKTOK_CLIENT_ID=...
TIKTOK_CLIENT_SECRET=...

# Creatify
CREATIFY_API_ID=...
CREATIFY_API_KEY=...

# OAuth
OAUTH_REDIRECT_BASE=https://api.example.com

# Google
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Encryption
ENCRYPTION_KEY=...                             # Key para encriptar tokens OAuth

# Frontend
NEXT_PUBLIC_API_URL=https://api.example.com
```

#### 2. **Autenticación y Autorización**

Actualmente hay fallback a `demo-org` y `demo-user`. Necesita:

- [ ] Implementar JWT tokens reales (login/signup)
- [ ] Roles y permisos (OWNER, ADMIN, EDITOR, VIEWER)
- [ ] Validación de JWT en middleware (ya está parcialmente)
- [ ] Rate limiting por organización
- [ ] Auditoría de cambios

#### 3. **Persistencia de Medios**

- [ ] S3 bucket creado y funcional
- [ ] CloudFront / CDN configurado
- [ ] Política de retención de archivos
- [ ] Backup automático

#### 4. **Monitoreo y Alertas**

- [ ] Logging centralizado (Datadog, CloudWatch, etc)
- [ ] Error tracking (Sentry)
- [ ] Monitoreo de jobs (BullMQ + Redis)
- [ ] Alertas de API failures
- [ ] Alertas de costos (Anthropic, Gemini)

#### 5. **Testing**

- [ ] Tests unitarios (servicios críticos)
- [ ] Tests e2e (flujos principales)
- [ ] Tests de carga (PublishingWorker, GenerationWorker)
- [ ] Tests de seguridad (OWASP)

### 🟡 Importante (should-have)

#### 1. **Token Refresh**

Actualmente no hay refresh automático de tokens OAuth. Cuando `tokenExpiresAt` se vence:
- [ ] Crear job que refrescare tokens antes de expiración
- [ ] Manejar errores cuando token es inválido durante publicación

#### 2. **Error Handling**

- [ ] Retry logic robusto con backoff exponencial
- [ ] Notificaciones a usuario cuando publicación falla
- [ ] Dashboard de "piezas fallidas" con detalles del error
- [ ] Manual para reconectar cuentas que fallan

#### 3. **Media Management**

Imágenes generadas y videos Creatify:
- [ ] Política de limpieza (borrar imágenes no usadas después de X días)
- [ ] Compresión automática de imágenes
- [ ] Conversión de formatos (WebP, etc)
- [ ] Thumbnails para preview

#### 4. **Analytics**

- [ ] Tracking de posts publicados (externalPostId)
- [ ] Fetch de métricas de redes sociales (likes, comments, reach)
- [ ] Dashboard de performance
- [ ] ROI por cliente

#### 5. **Rate Limiting**

- [ ] Límites por plataforma (Instagram permite X posts/hora)
- [ ] Queuing inteligente (no saturar APIs)
- [ ] Backpressure cuando APIs están lentas

#### 6. **Documentación de API**

- [ ] Swagger/OpenAPI docs
- [ ] Ejemplos de requests/responses
- [ ] Guía de integración

### 🟢 Nice-to-have (could-have)

- [ ] Bulk operations (programar múltiples piezas)
- [ ] AI-powered content suggestions
- [ ] A/B testing framework
- [ ] Team collaboration (comments, approvals)
- [ ] Content calendar templates
- [ ] Integración con Google Analytics
- [ ] Mobile app
- [ ] Webhooks para eventos

---

## Configuración de Producción

### Base de Datos

```sql
-- Crear base de datos
CREATE DATABASE contentai;
CREATE USER contentai WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE contentai TO contentai;

-- Migraciones
npx prisma@5 migrate deploy
```

### Redis

```bash
# Producción: Redis cluster o managed service (Railway, AWS ElastiCache)
# Desarrollo: Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### Storage

#### Opción A: AWS S3
```bash
# Crear bucket
aws s3 mb s3://contentai-media --region us-east-1

# Habilitar versionado
aws s3api put-bucket-versioning \
  --bucket contentai-media \
  --versioning-configuration Status=Enabled

# Configurar CORS
aws s3api put-bucket-cors \
  --bucket contentai-media \
  --cors-configuration file://cors.json
```

#### Opción B: MinIO (self-hosted)
```bash
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

### Deployment

#### Backend (Railway/Heroku/AWS)

```bash
# Env vars necesarias (ver sección arriba)
# Build automático desde git
# Migraciones automáticas pre-deploy
```

#### Frontend (Vercel/Netlify)

```bash
# Vercel: conectar repo → auto-deploy
# Env var: NEXT_PUBLIC_API_URL
```

### Nginx / Reverse Proxy

```nginx
upstream backend {
  server localhost:4000;
}

upstream frontend {
  server localhost:3000;
}

server {
  listen 80;
  server_name api.example.com;

  location / {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

server {
  listen 80;
  server_name app.example.com;

  location / {
    proxy_pass http://frontend;
    proxy_set_header Host $host;
  }
}
```

### SSL/TLS

```bash
# Let's Encrypt + certbot
certbot certonly --standalone -d api.example.com -d app.example.com
certbot renew --dry-run
```

---

## Deployment

### Checklist Pre-Producción

- [ ] Todas las variables de entorno configuradas
- [ ] Base de datos migraciones completadas
- [ ] Redis funcionando
- [ ] S3/MinIO bucket creado
- [ ] Social media API keys obtenidas
- [ ] Creatify Aurora API key configurada
- [ ] SSL/TLS certificados instalados
- [ ] Logging centralizado configurado
- [ ] Monitoring y alertas activas
- [ ] Backups automáticos programados
- [ ] Rate limiting activo
- [ ] Tests pasando
- [ ] Performance dentro de límites (Lighthouse > 80)

### Proceso de Deployment

```bash
# 1. Build y test
npm run build
npm run test

# 2. Migrations
npx prisma@5 migrate deploy

# 3. Push a repo
git push origin main

# 4. CI/CD pipelines ejecutan tests
# 5. Deploy a staging
# 6. Smoke tests en staging
# 7. Deploy a producción

# En caso de rollback:
# - Revertir migrations si es necesario
# - Deployar código anterior
# - Restaurar desde backup
```

### Monitoreo Post-Deployment

Verificar diariamente durante primer mes:

- [ ] Logs en Datadog/CloudWatch
- [ ] Errores en Sentry
- [ ] Costos de API (Anthropic, Gemini)
- [ ] Performance (response times, error rates)
- [ ] Jobs en cola (BullMQ dashboard)
- [ ] Database performance (queries lentas)
- [ ] S3 storage usage

---

## Costos Esperados (Estimado)

| Servicio | Costo Base | Por Pieza | Notas |
|----------|-----------|----------|-------|
| Claude API | $0 | $0.003-0.015 | Según modelo y tokens |
| Gemini Image | $0 | $0.004 | Por imagen generada |
| Creatify Aurora | $0 | $0.10-1.00 | Según modelo y duración |
| S3/MinIO | $5-50/mes | $0 | Almacenamiento + transferencia |
| Database (PostgreSQL) | $15/mes | $0 | Railway starter o auto-scaling |
| Redis | $5-30/mes | $0 | Railway o AWS ElastiCache |
| Compute (Backend) | $10-100/mes | $0 | Según concurrencia |
| Compute (Frontend) | $0 | $0 | Vercel o Netlify free tier |
| **Total mensual** | **$35-185** | **$0.117-1.019/pieza** | Varía con volumen |

---

## Roadmap Post-MVP

1. **Q2 2026**: Authentication real, team collaboration, analytics
2. **Q3 2026**: A/B testing, bulk operations, mobile app
3. **Q4 2026**: AI-powered suggestions, advanced scheduling
4. **Q1 2027**: Marketplace de templates, integración con Google Analytics

---

## Soporte y Escalado

### Escalado de Base de Datos

```sql
-- Índices para queries lentas
CREATE INDEX idx_content_pieces_status ON content_pieces(status);
CREATE INDEX idx_publish_queue_scheduled ON publish_queue(scheduled_at, status);
CREATE INDEX idx_api_usage_logs_org_date ON api_usage_logs(org_id, created_at DESC);

-- Particionamiento por date (si > 100M rows)
-- Read replicas para reportes
```

### Escalado de Colas

```bash
# Aumentar workers
BULLMQ_WORKERS=10  # default 5

# Cluster de Redis para alta concurrencia
# AWS ElastiCache Redis (cluster mode enabled)
```

### Escalado de Storage

```bash
# S3: ilimitado (pagar por transferencia)
# MinIO: agregar discos o servidores
```

---

## Preguntas Frecuentes

**P: ¿Cuánto tiempo tarda generar una pieza?**
R: Generación Claude: ~3-5s. Imagen Gemini: ~5-10s. Video Creatify: ~2-5 minutos. Total: ~7-15 minutos.

**P: ¿Qué pasa si falla una publicación?**
R: PublishingWorker reintenta 3 veces con backoff exponencial. Registra error en PublishQueue.lastError. Usuario ve en dashboard.

**P: ¿Puedo publicar a múltiples redes simultáneamente?**
R: Sí, crear PublishQueue para cada plataforma + cuenta. El worker procesa en paralelo (concurrency: 5).

**P: ¿Cómo manejamos picos de demanda?**
R: BullMQ automáticamente queda items. Si Redis se satura, escalar Redis. Si API hit limits, agregar backoff.

**P: ¿Datos de usuario están seguros?**
R: Tokens OAuth encriptados en DB. JWTs con expiración. Password hashing con bcrypt. HTTPS obligatorio.

---

**Última actualización**: Marzo 2026
**Versión**: MVP 1.0 (pre-producción)
