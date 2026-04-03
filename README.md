# ContentAI 🤖

Plataforma SaaS para agencias que necesitan **generar, aprobar, programar y publicar contenido en redes sociales** con IA, manteniendo control de costos por cliente y por organización.

> Estado actual: el frontend está operativo, el backend tiene módulos clave implementados, pero aún requiere hardening para producción inmediata.

---

## 1) Qué hace el proyecto hoy

### Funcionalidad de negocio
- Gestión multi-tenant (organizaciones, usuarios y clientes).
- Gestión de branding del cliente y Brand Notebook.
- Generación de contenido con IA (texto, prompts visuales, soporte de imagen/video).
- Flujo editorial (`DRAFT → APPROVED → SCHEDULED → PUBLISHED`).
- Scheduling y publicación automática a redes.
- Gestión de conexiones OAuth (Meta, LinkedIn, X, TikTok, Threads).
- Métricas/costos de uso de IA.

### Stack técnico
- **Frontend:** Next.js 14 + React + TypeScript + Tailwind.
- **Backend:** NestJS + Prisma + PostgreSQL + Redis + BullMQ.
- **Infra local:** Docker Compose (Postgres, Redis, MinIO, Bull Board).

---

## 2) Estructura del monorepo

```text
ContentAI/
├── apps/
│   ├── frontend/              # Next.js app
│   └── backend/               # NestJS API + workers
├── docker-compose.yml         # Postgres + Redis + MinIO + Bull Board
├── ARCHITECTURE.md            # Arquitectura detallada
├── PRODUCTION_GUIDE.md        # Guía funcional/operativa extensa
└── README.md
```

---

## 3) Requisitos

- Node.js **20.x** recomendado (alineado a Dockerfiles).
- npm 10+
- Docker + Docker Compose
- Cuenta de Anthropic (y opcionalmente Gemini / Creatify)
- PostgreSQL y Redis (local por compose o gestionados)

> Nota importante: en algunos entornos con proxy y Node 22, `bcrypt` puede fallar al instalar binarios precompilados. Para evitar esto, usa Node 20 y/o build containerizado.

---

## 4) Variables de entorno

## Backend (`apps/backend/.env`)
Partiendo de `apps/backend/.env.example`:

```bash
PORT=4000
JWT_SECRET=<super-secret>
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://contentai:contentai_dev@localhost:5432/contentai
REDIS_URL=redis://localhost:6379

# IA
ANTHROPIC_API_KEY=...
GEMINI_API_KEY=...

# Cifrado de tokens OAuth (32 bytes en hex = 64 chars)
ENCRYPTION_KEY=<64_hex_chars>

# OAuth redes
META_APP_ID=...
META_APP_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
X_CLIENT_ID=...
X_CLIENT_SECRET=...
OAUTH_REDIRECT_BASE=http://localhost:4000

# Google Calendar
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# S3 / MinIO
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=contentai-media
S3_ACCESS_KEY=contentai
S3_SECRET_KEY=contentai_dev
S3_PUBLIC_URL=http://localhost:9000/contentai-media

# Creatify
CREATIFY_API_ID=...
CREATIFY_API_KEY=...
```

## Frontend (`apps/frontend/.env.local`)
Partiendo de `apps/frontend/.env.example`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 5) Levantar entorno local para pruebas

### 5.1 Infraestructura
```bash
docker-compose up -d
```

Servicios:
- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- MinIO API: `localhost:9000`
- MinIO Console: `localhost:9001`
- Bull Board: `localhost:3030`

### 5.2 Backend
```bash
cd apps/backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

### 5.3 Frontend
```bash
cd apps/frontend
npm install
npm run dev
```

App web: `http://localhost:3000`

---

## 6) Build de producción

### Frontend
```bash
cd apps/frontend
npm run build
npm run start
```

### Backend
```bash
cd apps/backend
npm run build
npm run start:prod
```

---

## 7) Deployment en Railway (evitar error de Railpack en monorepo)

Si ves un error como **"Error creating build plan with Railpack"**, normalmente es por detección incorrecta del root en monorepo.

### Recomendación práctica
- Servicio **Backend**:
  - Root directory: `apps/backend`
  - Builder: Dockerfile (o Nixpacks con root correcto)
  - Start command: usar `entrypoint.sh` del Dockerfile
- Servicio **Frontend**:
  - Root directory: `apps/frontend`
  - Builder: Dockerfile
  - Exponer puerto `3000`
- Servicios gestionados: Postgres + Redis
- Variables por servicio (no mezclar frontend/backend)

### Orden recomendado de deploy
1. Crear Postgres y Redis.
2. Deploy backend (validar `/api/v1/...`).
3. Deploy frontend con `NEXT_PUBLIC_API_URL` apuntando al backend.
4. Probar OAuth callbacks con dominios finales.

---

### Healthchecks del backend
- `GET /api/v1/health/live` → liveness del proceso.
- `GET /api/v1/health/ready` → valida conectividad de PostgreSQL y Redis.

## 8) Checklist de pruebas (QA / staging)

### Smoke tests mínimos
- Login y flujo JWT.
- Crear cliente + branding + notebook.
- Generar contenido desde brief.
- Aprobar pieza y programarla.
- Worker publica a red sandbox o cuenta de prueba.
- Verificar registro de costos y estado en calendario.

### Pruebas técnicas recomendadas
- Unit tests: servicios críticos (auth, generation, publishing).
- Integration tests: Prisma + módulos Nest.
- E2E tests: happy-path completo desde API.
- Carga: cola BullMQ con jobs concurrentes.
- Seguridad: rate limit, CORS, secretos, cifrado, expiración/refresh OAuth.

---

## 9) Qué falta para “producción inmediata”

### Crítico (bloqueante)
1. **Suite de pruebas automatizadas real** (actualmente no hay tests implementados en repo).
2. **CI/CD** (lint, test, build y migraciones controladas por pipeline).
3. **Observabilidad** (logging estructurado, alertas, métricas y error tracking).
4. **Hardening de seguridad** (rotación de secretos, política de CORS por entorno, auditoría OAuth).
5. **Estrategia de backups + restore probado** para Postgres y assets.

### Alto impacto (muy recomendable antes de go-live)
1. Entorno **staging** separado de producción.
2. Idempotencia y reintentos controlados en publishing para evitar duplicados.
3. Runbooks operativos (incidentes, caída de APIs externas, token expirado).
4. Límites por tenant (cuotas, rate limits y control de costos por plan).
5. Healthchecks y readiness/liveness explícitos para despliegue.

---

## 10) Operación y mantenimiento

- Ejecutar migraciones con `prisma migrate deploy` en despliegue.
- Mantener versión fija de Node (idealmente 20.x) entre local/CI/prod.
- Revisar costos de IA semanalmente y ajustar router/modelos.
- Monitorear colas BullMQ y latencias de workers.

---

## 11) Documentación complementaria

- Arquitectura completa: `./ARCHITECTURE.md`
- Guía de producción extendida: `./PRODUCTION_GUIDE.md`

---

## 12) Plan de ejecución de 7 días (staging → producción)

### Día 1 — Base técnica y entornos
- Fijar versión de Node en CI/CD y producción (20.x).
- Crear entornos separados: `dev`, `staging`, `prod`.
- Configurar secretos completos por entorno (backend/frontend).
- Definir dominio final y callbacks OAuth por entorno.

**Criterio de salida:** backend y frontend desplegados en staging con variables correctas.

### Día 2 — Base de datos y datos críticos
- Ejecutar migraciones en staging con `prisma migrate deploy`.
- Definir política de backup automático (Postgres + bucket assets).
- Probar restauración (restore drill) en entorno aislado.

**Criterio de salida:** evidencia de backup + restore exitoso.

### Día 3 — Calidad y pruebas automatizadas
- Implementar tests unitarios en módulos críticos (`auth`, `generation`, `publishing`).
- Implementar tests de integración para Prisma y endpoints clave.
- Configurar pipeline CI: install → test → build.

**Criterio de salida:** pipeline verde en PR + cobertura mínima acordada.

### Día 4 — Seguridad y cumplimiento
- Revisar CORS por entorno y endurecer políticas.
- Rotación de secretos y validación de expiración de tokens OAuth.
- Aplicar rate limiting y auditoría de logs de autenticación/publicación.

**Criterio de salida:** checklist de seguridad aprobado internamente.

### Día 5 — Robustez operativa
- Implementar healthchecks (`/health`, readiness/liveness).
- Definir idempotencia en publicación para evitar duplicados.
- Afinar reintentos/backoff de jobs BullMQ y dead-letter strategy.

**Criterio de salida:** workers resilientes ante fallos transitorios de APIs externas.

### Día 6 — Observabilidad y on-call
- Logging estructurado (request id, tenant id, job id).
- Error tracking (Sentry o equivalente) y alertas por cola/errores 5xx.
- Dashboard mínimo: latencia API, jobs pendientes/fallidos, costo IA diario.

**Criterio de salida:** tablero operativo + alertas funcionales.

### Día 7 — Go/No-Go y lanzamiento
- Ejecutar smoke test completo en staging con cuentas sandbox reales.
- Revisión de riesgos abiertos y plan de rollback.
- Ventana de release controlada a producción.

**Criterio de salida:** decisión Go/No-Go documentada y release ejecutado.

---

## 13) Checklist de Go-Live (producción inmediata)

### Debe estar en ✅ antes de lanzar
- [ ] Pipeline CI/CD verde en rama principal.
- [ ] Migraciones validadas en staging y plan de rollback probado.
- [ ] Backups automáticos + restore test documentado.
- [ ] OAuth end-to-end validado en dominios de producción.
- [ ] Monitoreo y alertas operativas activas.
- [ ] Runbook de incidentes compartido con el equipo.
- [ ] Límite de costos IA por organización/plan habilitado.

### Señales de riesgo (no lanzar si aparece alguna)
- Jobs stuck o backlog de BullMQ sin visibilidad.
- Publicaciones duplicadas o sin idempotencia.
- Tokens OAuth expirando sin flujo de refresco confiable.
- Ausencia de plan de rollback verificable.
