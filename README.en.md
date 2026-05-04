# ContentAI

[English](README.en.md) | [Español](README.md)

SaaS platform for social media content generation and management, built for digital agencies. Generate text, images, and videos with AI, schedule posts, and manage multiple clients from a single dashboard.

---

## What does it do?

An agency uses ContentAI to manage all its clients in one place:

1. **Create a client** with a complete brand profile (colors, tone of voice, audience, Brand Notebook)
2. **Generate content** with a text brief → Claude generates captions, hashtags, hooks, scripts, CTAs
3. **Generate images** with Gemini (users can edit the prompt before generating)
4. **Generate videos with avatar** using Creatify Aurora (for Reels and Stories)
5. **Approve** the pieces they like
6. **Schedule** the post to Instagram, Facebook, LinkedIn, X
7. The system **automatically publishes** at the scheduled time

---

## Tech Stack

| Layer | Technology |
|------|-----------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript, Prisma ORM |
| Database | PostgreSQL |
| Job Queue | BullMQ + Redis |
| File Storage | S3 / MinIO |
| IA - Text | Anthropic Claude (Mythos, Opus 4.7, Sonnet 4.6, Haiku 4.5) |
| IA - Images | Google Gemini 2.0 Flash |
| IA - Videos | Creatify Aurora |
| Social Media | Meta Graph API, LinkedIn API, X API v2 |
| Calendar | Google Calendar API |

---

## Repository Structure

```
ContentAI/
├── apps/
│   ├── frontend/              # Next.js 14 (port 3000)
│   │   └── src/
│   │       ├── app/           # Entry point (layout + page.tsx)
│   │       ├── components/
│   │       │   ├── pages/     # 7 main pages
│   │       │   ├── layout/    # Sidebar
│   │       │   └── ui/        # Base components
│   │       └── lib/api.ts     # HTTP client
│   │
│   └── backend/               # NestJS (port 4000)
│       ├── prisma/
│       │   ├── schema.prisma  # Data model
│       │   └── migrations/    # SQL migrations
│       └── src/
│           ├── modules/
│           │   ├── auth/          # JWT login/register
│           │   ├── clients/       # Client management
│           │   ├── notebook/      # Brand Notebook
│           │   ├── generation/    # AI Workers + BullMQ
│           │   ├── content/       # Content pieces
│           │   ├── storage/       # S3/MinIO
│           │   ├── video/         # Creatify Aurora
│           │   ├── publishing/    # Social media publishing
│           │   ├── calendar/      # Scheduling + Google Calendar
│           │   ├── oauth/         # Social media OAuth
│           │   ├── analytics/     # Cost dashboard
│           │   ├── settings/      # Configuration
│           │   └── templates/     # Visual templates
│           └── common/            # Constants, AI models, encryption
│
├── docker-compose.yml         # PostgreSQL + Redis + MinIO + Bull-Board
├── PRODUCTION_GUIDE.md        # Complete production manual
├── IMPLEMENTATION_CHECKLIST.md # Pending tasks checklist
└── README.md                  # This file
```

## Frontend (`apps/frontend/.env.local`)
Based on `apps/frontend/.env.example`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Local Setup (Development)

### Requirements

- Node.js 20+
- Docker and Docker Compose
- An `ANTHROPIC_API_KEY` (minimum for generation to work)

### Step 1 — Infrastructure

```bash
docker-compose up -d
```

Starts:
- PostgreSQL on `localhost:5432` (user: `contentai`, pass: `contentai_dev`)
- Redis on `localhost:6379`
- MinIO on `localhost:9000` (console on `localhost:9001`, user: `contentai`, pass: `contentai_dev`)
- Bull-Board (queue monitor) on `localhost:3030`

### Step 2 — Backend

```bash
cd apps/backend
npm install
cp .env.example .env
```

Edit `.env` with at least:
```bash
JWT_SECRET=any-long-random-string-here
ANTHROPIC_API_KEY=sk-ant-...
ENCRYPTION_KEY=64-random-hexadecimal-characters
 
# Correct defaults for local Docker:
# DATABASE_URL is configured automatically (see note below)
```

> **Note**: `docker-compose` does not automatically inject `DATABASE_URL` locally. Add it to `.env`:
> ```
> DATABASE_URL=postgresql://contentai:contentai_dev@localhost:5432/contentai
> REDIS_URL=redis://localhost:6379
> ```

```bash
npx prisma@5 generate
npx prisma@5 migrate dev
npm run start:dev
```

API available at `http://localhost:4000`

### Step 3 — Frontend

```bash
cd apps/frontend
npm install
cp .env.example .env.local
# .env.local already has: NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev
```

App available at `http://localhost:3000`

### First Use

```bash
# Create agency account (only the first time):
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "your-password",
    "name": "Your Name",
    "organizationName": "My Agency"
  }'
```

Then open `http://localhost:3000` and use those credentials to log in.

---

## API Reference

Base URL: `http://localhost:4000/api/v1`

Authentication: `Authorization: Bearer <token>` in each request.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account + organization |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/clients` | List clients |
| POST | `/clients` | Create client |
| PUT | `/clients/:id` | Update client |
| DELETE | `/clients/:id` | Delete client |
| POST | `/notebook/:clientId/entries` | Add note to Brand Notebook |
| GET | `/notebook/:clientId/entries` | List notes |
| PUT | `/notebook/entries/:id` | Edit note |
| DELETE | `/notebook/entries/:id` | Delete note |
| POST | `/content/requests` | Generate content (brief + types) |
| GET | `/content/requests` | List all requests |
| GET | `/content/pieces/:id` | View content piece |
| PUT | `/content/pieces/:id` | Edit piece |
| PATCH | `/content/pieces/:id/approve` | Approve piece |
| PATCH | `/content/pieces/:id/reject` | Reject piece |
| POST | `/content/pieces/:id/image-prompt` | Generate image prompt with Claude |
| POST | `/content/pieces/:id/generate-image` | Generate image with Gemini |
| GET | `/content/pieces/:id/media` | List media for the piece |
| GET | `/calendar` | Calendar view (start + end query) |
| POST | `/calendar/schedule` | Schedule publication |
| DELETE | `/calendar/schedule/:pieceId` | Unschedule |
| GET | `/oauth/accounts?clientId=` | Connected social accounts |
| GET | `/oauth/:platform/authorize?clientId=` | Start social media OAuth |
| POST | `/video/generate` | Generate video with Creatify Aurora |
| GET | `/video/jobs/:id` | Video status |
| GET | `/storage/assets` | List files in S3 |
| GET | `/analytics/dashboard` | Dashboard metrics |
| GET | `/analytics/costs?days=30` | Cost history |

---

## Environment Variables

### Backend (`apps/backend/.env`)

```bash
# ── Required to work ──────────────────────────────
PORT=4000
JWT_SECRET=                   # Long random string (>32 chars)
ANTHROPIC_API_KEY=sk-ant-...  # For text generation + prompts
ENCRYPTION_KEY=               # 64 chars hex, to encrypt OAuth tokens
FRONTEND_URL=http://localhost:3000

# ── Database ───────────────────────────────────────────
DATABASE_URL=postgresql://contentai:contentai_dev@localhost:5432/contentai
REDIS_URL=redis://localhost:6379

# ── Images (optional, works without this) ──────────────────
GEMINI_API_KEY=AIza...

# ── Avatar Videos (optional) ───────────────────────────
CREATIFY_API_ID=
CREATIFY_API_KEY=

# ── File Storage (optional, images won't persist without S3) ─
S3_ENDPOINT=                  # Empty = AWS S3. For local MinIO: http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=contentai-media
S3_ACCESS_KEY=contentai       # In local MinIO use docker-compose credentials
S3_SECRET_KEY=contentai_dev
S3_PUBLIC_URL=http://localhost:9000/contentai-media

# ── Social Media (each is optional) ───────────────────
META_APP_ID=                  # Instagram + Facebook
META_APP_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
X_CLIENT_ID=                  # Twitter/X
X_CLIENT_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# ── Google Calendar (optional) ──────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OAUTH_REDIRECT_BASE=http://localhost:4000
```

### Frontend (`apps/frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Current Project Status

### ✅ Functional

| Feature | Status | Notes |
|---------|--------|-------|
| Client Management | ✅ Complete | Full CRUD + branding |
| Brand Notebook | ✅ Complete | Notes per client, context for AI |
| Text Generation (Claude) | ✅ Complete | POST, REEL, STORY, CAROUSEL |
| AI Routing (Sonnet/Haiku) | ✅ Complete | Automatic cost optimization |
| Response Cache | ✅ Complete | Redis (exact) + PostgreSQL (semantic) |
| Image Generation (Gemini) | ✅ Complete | Editable prompt before generating |
| Video Generation (Creatify) | ✅ Complete | For REEL and STORY |
| S3/MinIO Storage | ✅ Complete | Images persist in S3 |
| Approve/Reject Pieces | ✅ Complete | DRAFT → APPROVED workflow |
| Schedule Posts | ✅ Complete | Modal with account selector + date |
| Automatic Publishing | ✅ Complete | Instagram, Facebook, LinkedIn, X |
| Calendar View | ✅ Complete | Monthly view, schedule, unschedule |
| Social Accounts (OAuth) | ✅ Complete | Meta, LinkedIn, X, TikTok, Threads |
| Google Calendar Sync | ✅ Complete | Event export when scheduling |
| Cost Tracking | ✅ Complete | Cost dashboard per model |
| Model Selector | ✅ Complete | Support for Mythos, Opus 4.7, and Sonnet 4.6 |
| Login/Register UI | ✅ Complete | Screen with login/register tabs |
| JWT in API Requests | ✅ Complete | api.ts sends Bearer token automatically |
| Page Lazy Loading | ✅ Complete | next/dynamic — reduced initial bundle |
| JWT Login/Register | ✅ Complete | Functional API + UI |
| Multi-tenancy | ✅ Complete | Real isolation via orgId (no hardcoded IDs) |

### ⚠️ Pending for Testing

| Feature | Priority | Description |
|---------|-----------|-------------|
| **Test Data Seed** | ✅ Ready | Script with admin + test client + content in `prisma/seed-admin.ts` |

### ⛔ Pending for Production

| Feature | Priority | Description |
|---------|-----------|-------------|
| **Guards on all Endpoints** | ✅ Resolved | `demo-org` backdoor removed from `JwtAuthGuard`. JWT required on all endpoints. |
| **Real Environment Variables** | 🔴 Critical | Social media APIs (META, LINKEDIN, X), S3, Creatify. See variables section. |
| **OAuth Token Refresh** | ✅ Resolved | Auto-refresh for Meta/X implemented in `OAuthService.getValidAccessToken()`. Daily audit cron. |
| **UI Error Notifications** | ✅ Resolved | Toast system in frontend + publication failure emails via `EmailService`. |
| **Rate Limiting** | ✅ Resolved | Global (20/s, 200/min). Strict on auth (5/min) and content generation (10/min). |
| **Monitoring + Alerts** | ✅ Resolved | `/api/v1/health/status` endpoint with real-time metrics (orgs, queues, expiring tokens). |

---

## Technical Details for Testing

### 1. Create Administrator User

**Option A — Via UI** (recommended):
Open the app in your browser → login appears → "Create Account" tab → fill out the form.

**Option B — Seed Script**:
```bash
cd apps/backend
# Configure INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in .env
npx ts-node prisma/seed-admin.ts
```
It will create the user with the credentials defined in your `.env` file.

**Option C — Via curl** (if backend is running):
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"test1234","name":"Admin","organizationName":"Test Agency"}'
```

### 2. Test Content Seed

```bash
# Create test client (use registration token)
curl -X POST http://localhost:4000/api/v1/clients \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Nike Argentina","industry":"Sports","branding":{"primaryColor":"#FF6600","toneOfVoice":"Inspirational, energetic"}}'
```

---

## Deployment on Railway (recommended)

Railway can host PostgreSQL, Redis, backend, and frontend in a single project.

### 1. Create Project on Railway

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
```

### 2. Add Services

From the Railway dashboard:
1. **PostgreSQL** → New Service → Database → PostgreSQL
2. **Redis** → New Service → Database → Redis
3. **Backend** → New Service → GitHub Repo → `apps/backend`
4. **Frontend** → New Service → GitHub Repo → `apps/frontend`

### 3. Backend Environment Variables on Railway

Railway automatically injects `DATABASE_URL` and `REDIS_URL` when linking services. Just add:

```
JWT_SECRET=<long random>
ANTHROPIC_API_KEY=<your key>
ENCRYPTION_KEY=<64 chars hex>
FRONTEND_URL=<Frontend URL on Railway>
GEMINI_API_KEY=<optional>
```

### 4. Build Commands

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

### 5. Frontend Variables

```
NEXT_PUBLIC_API_URL=<Backend URL on Railway>
```

---

## Deployment on VPS (Ubuntu)

```bash
# 1. Install dependencies
apt update && apt install -y nodejs npm docker.io docker-compose nginx certbot

# 2. Clone repo
git clone <repo> /var/www/contentai
cd /var/www/contentai

# 3. Start infrastructure
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

# 6. Nginx as Proxy
# See PRODUCTION_GUIDE.md for complete config

# 7. SSL
certbot --nginx -d api.yourdomain.com -d app.yourdomain.com
```

---

## AI Models and Estimated Costs

| Task | Model | Approx. Cost per Piece |
|-------|--------|----------------------|
| Strategic Analysis | Claude Mythos Preview | $0.050 |
| POST Caption | Claude Sonnet 4.6 | $0.008 |
| REEL Script | Claude Opus 4.7 | $0.025 |
| Hashtags | Claude Haiku 4.5 | $0.001 |
| Image Prompt | Claude Haiku 4.5 | $0.001 |
| Image | Gemini 2.0 Flash | $0.004 |
| Avatar Video | Creatify Aurora | $0.10 - $1.00 |

The system automatically caches responses to reduce costs on similar requests.

---

## Queue Monitoring

Bull-Board available at `http://localhost:3030` shows:
- Jobs in queue, processing, completed, failed
- Retry failed jobs
- View error logs

In production, protect this endpoint with basic authentication.

---

## Additional Documentation

- [`PRODUCTION_GUIDE.md`](./PRODUCTION_GUIDE.md) — Complete architecture, flows, costs, FAQ
- [`IMPLEMENTATION_CHECKLIST.md`](./IMPLEMENTATION_CHECKLIST.md) — Prioritized checklist of pending tasks
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System and queue diagrams
