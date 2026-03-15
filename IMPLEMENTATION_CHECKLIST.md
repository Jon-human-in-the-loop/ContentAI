# ContentAI — Checklist de Implementación para Producción

## 🔴 CRÍTICO — Sin esto NO se puede lanzar

### Autenticación y Seguridad
- [ ] **JWT real**: Sistema de login/signup con JWT tokens (actualmente fallback a demo-org)
  - Endpoint: `POST /auth/signup` y `POST /auth/login`
  - Middleware validar JWT en cada request
  - Refresh tokens
  - Logout + token invalidation

- [ ] **Encriptación de tokens OAuth**: Key generada y guardada en secreto
  - Usar `ENCRYPTION_KEY` en `.env`
  - Renovar key cada 90 días

- [ ] **Rate limiting**: Protección contra abuse
  - Limite de requests por IP
  - Limite de generaciones por organización
  - Límite de publicaciones por plataforma

- [ ] **OWASP**: Validaciones de seguridad
  - Input validation (inyección SQL, XSS)
  - CSRF tokens
  - CORS configurado correctamente
  - Helmet.js en Express

### Variables de Entorno
- [ ] **Crear `.env.production`** con todos los valores reales:
  ```
  DATABASE_URL
  REDIS_URL
  ANTHROPIC_API_KEY
  GEMINI_API_KEY
  S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_PUBLIC_URL
  META_APP_ID, META_APP_SECRET
  LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
  TWITTER_API_KEY, TWITTER_API_SECRET
  CREATIFY_API_ID, CREATIFY_API_KEY
  ENCRYPTION_KEY
  JWT_SECRET
  FRONTEND_URL, OAUTH_REDIRECT_BASE
  ```

- [ ] **No commitear secrets**: Usar GitHub Secrets o gestión de secretos
  - Railway: Environment Variables (UI)
  - AWS: Secrets Manager
  - Vault: HashiCorp Vault

### Infraestructura
- [ ] **PostgreSQL**: Base de datos productiva
  - Railway Postgres ✓ (fácil, $10/mes)
  - AWS RDS
  - Self-hosted con backups

- [ ] **Redis**: Para caché y colas
  - Railway Redis ✓ (fácil, $5/mes)
  - AWS ElastiCache
  - Self-hosted Docker

- [ ] **Storage S3/MinIO**: Para imágenes y archivos
  - AWS S3 ✓ (recommended)
  - MinIO self-hosted
  - CloudFront CDN

- [ ] **Migraciones**: Ejecutadas y validadas
  ```bash
  npx prisma@5 migrate deploy
  ```

### APIs Externas — Tokens Obtenidos
- [ ] **Anthropic**: ANTHROPIC_API_KEY activa
- [ ] **Google Gemini**: GEMINI_API_KEY activa
- [ ] **Creatify Aurora**: CREATIFY_API_ID y CREATIFY_API_KEY
- [ ] **Meta (Instagram/Facebook)**: APP_ID y APP_SECRET
- [ ] **LinkedIn**: CLIENT_ID y CLIENT_SECRET
- [ ] **X/Twitter**: API_KEY y API_SECRET
- [ ] **TikTok**: CLIENT_ID y CLIENT_SECRET (optional)

### Testing
- [ ] **Tests unitarios**: Servicios críticos
  - [ ] ContentService
  - [ ] PublishingService
  - [ ] OAuthService

- [ ] **Tests e2e**: Flujos principales
  - [ ] Crear cliente → generar contenido → aprobar → programar → publicar
  - [ ] OAuth flow completo
  - [ ] S3 upload y retrieve

- [ ] **Tests de carga**: Simular peak
  - [ ] 100+ jobs en BullMQ simultáneamente
  - [ ] 10+ usuarios generando en paralelo

---

## 🟡 IMPORTANTE — Necesario dentro de 1 semana

### Error Handling y Notificaciones
- [ ] **Notificaciones de error en frontend**: Toast/alert cuando:
  - Generación falla
  - Publicación falla
  - Token OAuth vencido
  - S3 upload falla

- [ ] **Dashboard de piezas fallidas**: Ver qué no funcionó y por qué
  - Mostrar `PublishQueue.lastError`
  - Link para reconectar cuenta
  - Opción para reintentar

- [ ] **Logging centralizado**: Datadog, CloudWatch o Sentry
  - Capturar errores en GenerationWorker
  - Capturar errores en PublishingWorker
  - Capturar API failures

### Monitoreo
- [ ] **BullMQ Dashboard**: Ver estado de colas
  - Activos, completados, fallidos
  - Retry automático

- [ ] **Database Monitoring**: Detectar queries lentas
  - Slow query log
  - Índices para queries frecuentes

- [ ] **API Cost Tracking**: Saber cuánto gastamos
  - Claude: tokens * precio
  - Gemini: requests * precio
  - Creatify: requests * precio
  - Dashboard con gráficos

### Optimizaciones
- [ ] **Caché de Brand Notebook**: No cargar en cada generación
  - Cache por cliente con invalidación
  - TTL: 1 hora

- [ ] **Compresión de imágenes**: Reducir S3 storage
  - Sharp o ImageMagick
  - Generar WebP para web

- [ ] **Lazy loading en frontend**: Performance
  - Lighthouse scores > 80
  - First Contentful Paint < 2s

---

## 🟢 NICE-TO-HAVE — Antes del MVP v1.1

### Analytics
- [ ] **Dashboard de performance**: Ver qué funciona
  - Piezas generadas (total, por cliente, por tipo)
  - Piezas publicadas (total, por plataforma)
  - Costos por cliente
  - Engagement (si APIs de redes permiten)

- [ ] **Tracking de posts**: Guardar externalPostId y permitir update
  - Fetch de métricas de Instagram/Facebook/LinkedIn/X

### Funcionalidades User-facing
- [ ] **Historial de cambios**: Auditoría de ediciones
  - Quién cambió qué y cuándo
  - Versiones anteriores de piezas

- [ ] **Colecciones/Campañas**: Agrupar piezas relacionadas
  - Publish múltiples juntas
  - Dashboard por campaña

- [ ] **Templates**: Guardar formatos recurrentes
  - "Instagram growth hacks" → usa estos parámetros
  - Reutilizar para nuevos clientes

### Integraciones
- [ ] **Google Calendar sync**: Las piezas programadas aparecen en Google Calendar
  - Ya está el endpoint, solo completar

- [ ] **Webhooks**: Notificar cuando pieza se publica
  - POST a URL del cliente
  - Payload: { pieceId, status, externalPostId, platform, timestamp }

---

## 📋 Orden de Implementación Recomendado

### Semana 1: Seguridad y Auth
1. Implementar JWT real (login/signup)
2. Validar JWT en middleware
3. Encriptar tokens OAuth
4. Configurar CORS y Helmet

### Semana 2: Error Handling
5. Toast/alerts de error en frontend
6. Dashboard de piezas fallidas
7. Logging centralizado (Sentry)

### Semana 3: Infraestructura
8. Provisionar PostgreSQL, Redis, S3
9. Migraciones ejecutadas
10. Backup automático

### Semana 4: Testing y Deployment
11. Tests unitarios core
12. Tests e2e
13. Deploy a staging
14. Validar en staging

### Semana 5: Monitoreo en Vivo
15. BullMQ dashboard
16. Database monitoring
17. API cost tracking
18. Alertas automáticas

---

## 🚀 Comandos para Deploy

```bash
# 1. Prepara environment
export NODE_ENV=production
export $(cat .env.production | xargs)

# 2. Build
npm run build

# 3. Migraciones
npx prisma@5 migrate deploy

# 4. Test
npm run test:e2e

# 5. Deploy (Railway/Heroku/AWS)
git push origin main  # CI/CD toma control

# 6. Monitoreo
# - Ver logs en Datadog/CloudWatch
# - Ver errores en Sentry
# - Ver colas en BullMQ dashboard
# - Ver costs en API dashboards
```

---

## 📊 Matriz de Dependencias

```
JWT Auth (requirement)
  ├─ Rate Limiting (depends on)
  ├─ API Security (depends on)
  └─ User Identification (depends on)

Error Handling (depends on): Logging
  ├─ Toast Notifications (depends on)
  ├─ Failed Pieces Dashboard (depends on)
  └─ Monitoring Alerts (depends on)

OAuth Integration (requires): Encryption
  └─ Token Refresh (depends on)

Publishing Workflow (requires): OAuth + Error Handling
  ├─ Retry Logic (depends on)
  └─ Performance Monitoring (depends on)

S3 Storage (requires): AWS/MinIO Account
  ├─ CDN (depends on)
  └─ Backup Policy (depends on)
```

---

## ✅ Go-Live Checklist (Antes de anunciar públicamente)

- [ ] Todos los CRÍTICO items completados
- [ ] Staging environment funciona igual a producción
- [ ] Backup automático probado (restore funciona)
- [ ] Rollback plan documentado
- [ ] On-call rotation definido (quién atiende issues)
- [ ] SLA definido (99.9% uptime, response < 2s)
- [ ] Términos de servicio y privacy policy listos
- [ ] Soporte email/Slack configurado
- [ ] Documentación de usuario completa
- [ ] Video tutorial de onboarding
- [ ] Analytics rastreando eventos clave

---

## 📞 Soporte Postlanzamiento

### Día 1: Monitoreo intenso
- Monitor logs cada 30 minutos
- Responder a errores inmediatamente
- Estar listo para rollback

### Semana 1: Ajustes rápidos
- Rate limits (?): Ajustar
- Performance lento (?): Optimizar
- UX confuso (?): Mejorar

### Mes 1: Estabilización
- Documentar todos los bugs encontrados
- Priorizar fixes
- Hacer release v1.0.1, v1.0.2, etc

---

**Estado actual (Marzo 2026)**: MVP 1.0 code complete
**Target**: MVP 1.0 production-ready en Abril 2026
