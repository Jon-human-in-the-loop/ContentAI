# ContentAI

Plataforma SaaS de generación y gestión de contenido para redes sociales, construida para agencias digitales. Genera texto, imágenes y videos con IA, programa publicaciones y gestiona múltiples clientes desde un solo dashboard.

---

## ¿Qué hace?

Una agencia usa ContentAI para gestionar todos sus clientes desde un mismo lugar:

1. **Crea un cliente** con su perfil de marca completo (colores, tono de voz, audiencia, Brand Notebook)
2. **Genera contenido** con un brief de texto → Claude genera captions, hashtags, hooks, scripts, CTAs
3. **Genera imágenes** con Gemini (el usuario puede editar el prompt antes de generar)
4. **Genera videos con avatar** usando Creatify Aurora (para Reels y Stories)
5. **Aprueba** las piezas que le gustan
6. **Programa** la publicación en Instagram, Facebook, LinkedIn, X
7. El sistema **publica automáticamente** a la hora programada

---

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript, Prisma ORM |
| Base de datos | PostgreSQL |
| Cola de trabajos | BullMQ + Redis |
| Storage de archivos | S3 / MinIO |
| IA - Texto | Anthropic Claude (Mythos, Opus 4.7, Sonnet 4.6, Haiku 4.5) |
| IA - Imágenes | Google Gemini 2.0 Flash |
| IA - Videos | Creatify Aurora |
| Redes sociales | Meta Graph API, LinkedIn API, X API v2 |
| Calendario | Google Calendar API |

---

## Estructura del repositorio

```
ContentAI/
├── apps/
│   ├── frontend/              # Next.js 14 (puerto 3000)
│   │   └── src/
│   │       ├── app/           # Entry point (layout + page.tsx)
│   │       ├── components/
│   │       │   ├── pages/     # 7 páginas principales
│   │       │   ├── layout/    # Sidebar
│   │       │   └── ui/        # Componentes base
│   │       └── lib/api.ts     # HTTP client
│   │
│   └── backend/               # NestJS (puerto 4000)
│       ├── prisma/
│       │   ├── schema.prisma  # Modelo de datos
│       │   └── migrations/    # Migraciones SQL
│       └── src/
│           ├── modules/
│           │   ├── auth/          # JWT login/registro
│           │   ├── clients/       # Gestión de clientes
│           │   ├── notebook/      # Brand Notebook
│           │   ├── generation/    # Workers IA + BullMQ
│           │   ├── content/       # Piezas de contenido
│           │   ├── storage/       # S3/MinIO
│           │   ├── video/         # Creatify Aurora
│           │   ├── publishing/    # Publicación a redes
│           │   ├── calendar/      # Scheduling + Google Calendar
│           │   ├── oauth/         # OAuth de redes sociales
│           │   ├── analytics/     # Dashboard de costos
│           │   ├── settings/      # Configuración
│           │   └── templates/     # Templates visuales
│           └── common/            # Constantes, modelos IA, encryption
│
├── docker-compose.yml         # PostgreSQL + Redis + MinIO + Bull-Board
├── PRODUCTION_GUIDE.md        # Manual completo de producción
├── IMPLEMENTATION_CHECKLIST.md # Checklist de tareas pendientes
└── README.md                  # Este archivo
```

## Frontend (`apps/frontend/.env.local`)
Partiendo de `apps/frontend/.env.example`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Levantar en local (desarrollo)

### Requisitos

- Node.js 20+
- Docker y Docker Compose
- Una `ANTHROPIC_API_KEY` (mínimo para que funcione la generación)

### Paso 1 — Infraestructura

```bash
docker-compose up -d
```

Levanta:
- PostgreSQL en `localhost:5432` (usuario: `contentai`, pass: `contentai_dev`)
- Redis en `localhost:6379`
- MinIO en `localhost:9000` (consola en `localhost:9001`, user: `contentai`, pass: `contentai_dev`)
- Bull-Board (monitor de colas) en `localhost:3030`

### Paso 2 — Backend

```bash
cd apps/backend
npm install
cp .env.example .env
```

Editá `.env` con al menos:
```bash
JWT_SECRET=cualquier-string-largo-y-random-aqui
ANTHROPIC_API_KEY=sk-ant-...
ENCRYPTION_KEY=64-caracteres-hexadecimales-random

# Ya tienen defaults correctos para Docker local:
# DATABASE_URL se configura automáticamente (ver nota abajo)
```

> **Nota**: `docker-compose` no inyecta `DATABASE_URL` automáticamente en local. Agregala a `.env`:
> ```
> DATABASE_URL=postgresql://contentai:contentai_dev@localhost:5432/contentai
> REDIS_URL=redis://localhost:6379
> ```

```bash
npx prisma@5 generate
npx prisma@5 migrate dev
npm run start:dev
```

API disponible en `http://localhost:4000`

### Paso 3 — Frontend

```bash
cd apps/frontend
npm install
cp .env.example .env.local
# .env.local ya tiene: NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev
```

App disponible en `http://localhost:3000`

### Primer uso

```bash
# Crear cuenta de agencia (solo la primera vez):
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu@email.com",
    "password": "tu-password",
    "name": "Tu Nombre",
    "organizationName": "Mi Agencia"
  }'
```

Luego abre `http://localhost:3000` y usa esas credenciales para iniciar sesión.

---

## API Reference

Base URL: `http://localhost:4000/api/v1`

Autenticación: `Authorization: Bearer <token>` en cada request.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/register` | Crear cuenta + organización |
| POST | `/auth/login` | Login, devuelve JWT |
| GET | `/clients` | Listar clientes |
| POST | `/clients` | Crear cliente |
| PUT | `/clients/:id` | Actualizar cliente |
| DELETE | `/clients/:id` | Eliminar cliente |
| POST | `/notebook/:clientId/entries` | Agregar nota al Brand Notebook |
| GET | `/notebook/:clientId/entries` | Listar notas |
| PUT | `/notebook/entries/:id` | Editar nota |
| DELETE | `/notebook/entries/:id` | Eliminar nota |
| POST | `/content/requests` | Generar contenido (brief + tipos) |
| GET | `/content/requests` | Listar todas las solicitudes |
| GET | `/content/pieces/:id` | Ver pieza de contenido |
| PUT | `/content/pieces/:id` | Editar pieza |
| PATCH | `/content/pieces/:id/approve` | Aprobar pieza |
| PATCH | `/content/pieces/:id/reject` | Rechazar pieza |
| POST | `/content/pieces/:id/image-prompt` | Generar prompt de imagen con Claude |
| POST | `/content/pieces/:id/generate-image` | Generar imagen con Gemini |
| GET | `/content/pieces/:id/media` | Listar medios de la pieza |
| GET | `/calendar` | Vista de calendario (start + end query) |
| POST | `/calendar/schedule` | Programar publicación |
| DELETE | `/calendar/schedule/:pieceId` | Desprogramar |
| GET | `/oauth/accounts?clientId=` | Cuentas sociales conectadas |
| GET | `/oauth/:platform/authorize?clientId=` | Iniciar OAuth de red social |
| POST | `/video/generate` | Generar video con Creatify Aurora |
| GET | `/video/jobs/:id` | Estado del video |
| GET | `/storage/assets` | Listar archivos en S3 |
| GET | `/analytics/dashboard` | Métricas del dashboard |
| GET | `/analytics/costs?days=30` | Histórico de costos |

---

## Variables de entorno

### Backend (`apps/backend/.env`)

```bash
# ── Obligatorio para funcionar ──────────────────────────────
PORT=4000
JWT_SECRET=                   # String random largo (>32 chars)
ANTHROPIC_API_KEY=sk-ant-...  # Para generación de texto + prompts
ENCRYPTION_KEY=               # 64 chars hex, para encriptar tokens OAuth
FRONTEND_URL=http://localhost:3000

# ── Base de datos ───────────────────────────────────────────
DATABASE_URL=postgresql://contentai:contentai_dev@localhost:5432/contentai
REDIS_URL=redis://localhost:6379

# ── Imágenes (opcional, funciona sin esto) ──────────────────
GEMINI_API_KEY=AIza...

# ── Videos con avatar (opcional) ───────────────────────────
CREATIFY_API_ID=
CREATIFY_API_KEY=

# ── Storage de archivos (opcional, sin S3 no persiste imágenes) ─
S3_ENDPOINT=                  # Vacío = AWS S3. Para MinIO local: http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=contentai-media
S3_ACCESS_KEY=contentai       # En MinIO local usa las credenciales de docker-compose
S3_SECRET_KEY=contentai_dev
S3_PUBLIC_URL=http://localhost:9000/contentai-media

# ── Redes sociales (cada una es opcional) ───────────────────
META_APP_ID=                  # Instagram + Facebook
META_APP_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
X_CLIENT_ID=                  # Twitter/X
X_CLIENT_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# ── Google Calendar (opcional) ──────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OAUTH_REDIRECT_BASE=http://localhost:4000
```

### Frontend (`apps/frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Estado actual del proyecto

### ✅ Funcional

| Feature | Estado | Notas |
|---------|--------|-------|
| Gestión de clientes | ✅ Completo | CRUD + branding completo |
| Brand Notebook | ✅ Completo | Notas por cliente, contexto para IA |
| Generación de texto (Claude) | ✅ Completo | POST, REEL, STORY, CAROUSEL |
| Routing IA (Sonnet/Haiku) | ✅ Completo | Optimización automática de costos |
| Cache de respuestas | ✅ Completo | Redis (exacto) + PostgreSQL (semántico) |
| Generación de imágenes (Gemini) | ✅ Completo | Prompt editable antes de generar |
| Generación de videos (Creatify) | ✅ Completo | Para REEL y STORY |
| Storage S3/MinIO | ✅ Completo | Imágenes persisten en S3 |
| Aprobar/rechazar piezas | ✅ Completo | Workflow DRAFT → APPROVED |
| Programar publicaciones | ✅ Completo | Modal con selector de cuenta + fecha |
| Publicación automática | ✅ Completo | Instagram, Facebook, LinkedIn, X |
| Calendar view | ✅ Completo | Vista mensual, programar, desprogramar |
| Cuentas de redes sociales (OAuth) | ✅ Completo | Meta, LinkedIn, X, TikTok, Threads |
| Google Calendar sync | ✅ Completo | Export de eventos al programar |
| Cost tracking | ✅ Completo | Dashboard de costos por modelo |
| Selector de Modelos | ✅ Completo | Soporte para Mythos, Opus 4.7 y Sonnet 4.6 |
| Login/Register UI | ✅ Completo | Pantalla con tabs login/registro |
| JWT en peticiones API | ✅ Completo | api.ts envía Bearer token automáticamente |
| Lazy loading de páginas | ✅ Completo | next/dynamic — bundle inicial reducido |
| Registro/Login JWT | ✅ Completo | API + UI funcionales |
| Multi-tenancy | ✅ Completo | Aislamiento real por orgId (sin hardcoded IDs) |

### ⚠️ Pendiente para pruebas

| Feature | Prioridad | Descripción |
|---------|-----------|-------------|
| **Seed de datos de prueba** | 🟡 Media | Script disponible en `prisma/seed-admin.ts` |

### ⛔ Pendiente para producción

| Feature | Prioridad | Descripción |
|---------|-----------|-------------|
| **Guards en todos los endpoints** | 🔴 Crítico | Algunos controllers usan `\|\| 'demo-org'` en vez de JWT |
| **Variables de entorno reales** | 🔴 Crítico | APIs de redes sociales, S3, Creatify |
| **Token refresh OAuth** | 🟡 Media | Tokens vencen, no hay auto-refresh |
| **Error notifications en UI** | 🟡 Media | Cuando falla una publicación no avisa |
| **Rate limiting** | 🟡 Media | Protección contra abuse |
| **Monitoreo + alertas** | 🟡 Media | Sentry, Datadog, etc. |

---

## Lo que falta para pruebas (detalle técnico)

### 1. Crear usuario administrador

**Opción A — Mediante la UI** (recomendado):
Abre la app en el navegador → aparece el login → tab "Crear cuenta" → completa el formulario.

**Opción B — Script de seed**:
```bash
cd apps/backend
# Configura INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD en .env
npx ts-node prisma/seed-admin.ts
```
Creará el usuario con las credenciales que hayas definido en tu archivo `.env`.

**Opción C — Mediante curl** (si el backend está levantado):
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"test1234","name":"Admin","organizationName":"Test Agency"}'
```

### 2. Seed de contenido de prueba

```bash
# Crear cliente de prueba (usa el token del registro)
curl -X POST http://localhost:4000/api/v1/clients \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Nike Argentina","industry":"Deportes","branding":{"primaryColor":"#FF6600","toneOfVoice":"Inspiracional, energético"}}'
```

---

## Deployment en Railway (recomendado)

Railway puede hostear PostgreSQL, Redis, backend y frontend en un solo proyecto.

### 1. Crear proyecto en Railway

```bash
# Instalar Railway CLI
npm install -g @railway/cli
railway login
railway init
```

### 2. Agregar servicios

Desde el dashboard de Railway:
1. **PostgreSQL** → New Service → Database → PostgreSQL
2. **Redis** → New Service → Database → Redis
3. **Backend** → New Service → GitHub Repo → `apps/backend`
4. **Frontend** → New Service → GitHub Repo → `apps/frontend`

### 3. Variables de entorno del backend en Railway

Railway inyecta `DATABASE_URL` y `REDIS_URL` automáticamente al vincular los servicios. Solo agregar:

```
JWT_SECRET=<random largo>
ANTHROPIC_API_KEY=<tu key>
ENCRYPTION_KEY=<64 chars hex>
FRONTEND_URL=<URL del frontend en Railway>
GEMINI_API_KEY=<opcional>
```

### 4. Build commands

**Backend:**
```
Build: npm install && npx prisma generate && npm run build
Start: npx prisma migrate deploy && npm run start:prod
```

**Frontend:**
```
Build: npm install && npm run build
Start: npm run start
```

### 5. Variables del frontend

```
NEXT_PUBLIC_API_URL=<URL del backend en Railway>
```

---

## Deployment en VPS (Ubuntu)

```bash
# 1. Instalar dependencias
apt update && apt install -y nodejs npm docker.io docker-compose nginx certbot

# 2. Clonar repo
git clone <repo> /var/www/contentai
cd /var/www/contentai

# 3. Levantar infraestructura
docker-compose up -d postgres redis minio

# 4. Backend
cd apps/backend
npm install
npx prisma@5 generate
npx prisma@5 migrate deploy
npm run build
npm run start:prod &

# 5. Frontend
cd apps/frontend
npm install
npm run build
npm run start &

# 6. Nginx como proxy
# Ver PRODUCTION_GUIDE.md para config completa

# 7. SSL
certbot --nginx -d api.tudominio.com -d app.tudominio.com
```

---

## Modelos de IA y costos estimados

| Tarea | Modelo | Costo aprox por pieza |
|-------|--------|----------------------|
| Análisis Estratégico | Claude Mythos Preview | $0.050 |
| Caption POST | Claude Sonnet 4.6 | $0.008 |
| Script REEL | Claude Opus 4.7 | $0.025 |
| Hashtags | Claude Haiku 4.5 | $0.001 |
| Prompt de imagen | Claude Haiku 4.5 | $0.001 |
| Imagen | Gemini 2.0 Flash | $0.004 |
| Video con avatar | Creatify Aurora | $0.10 - $1.00 |

El sistema cachea respuestas automáticamente para reducir costos en solicitudes similares.

---

## Monitoreo de colas

Bull-Board disponible en `http://localhost:3030` muestra:
- Jobs en cola, procesando, completados, fallidos
- Reintentar jobs fallidos
- Ver logs de errores

En producción, proteger este endpoint con autenticación básica.

---

## Documentación adicional

- [`PRODUCTION_GUIDE.md`](./PRODUCTION_GUIDE.md) — Arquitectura completa, flujos, costos, FAQ
- [`IMPLEMENTATION_CHECKLIST.md`](./IMPLEMENTATION_CHECKLIST.md) — Checklist priorizado de tareas pendientes
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Diagramas de sistema y queues
