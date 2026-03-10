# ContentAI Backend

AI-powered content generation platform for social media agencies.

## Architecture

See [ARCHITECTURE.md](../ARCHITECTURE.md) for the full system design.

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Anthropic API key

### Setup

```bash
# 1. Start infrastructure
cd docker && docker-compose up -d

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY

# 4. Run database migrations
npx prisma migrate dev

# 5. Seed demo data (optional)
npm run prisma:seed

# 6. Start development server
npm run start:dev
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Register org + user |
| POST | /api/v1/auth/login | Login |
| GET | /api/v1/clients | List clients |
| POST | /api/v1/clients | Create client |
| GET | /api/v1/clients/:id | Get client details |
| PUT | /api/v1/clients/:id | Update client |
| POST | /api/v1/content/requests | Create generation request |
| GET | /api/v1/content/requests | List requests |
| GET | /api/v1/content/pieces/:id | Get content piece |
| PATCH | /api/v1/content/pieces/:id/approve | Approve piece |
| PATCH | /api/v1/content/pieces/:id/reject | Reject piece |
| GET | /api/v1/calendar?start=&end= | Calendar view |
| POST | /api/v1/calendar/schedule | Schedule a piece |
| GET | /api/v1/analytics/dashboard | Dashboard metrics |
| GET | /api/v1/analytics/costs | Cost history |

### Project Structure

```
src/
├── main.ts                      # Entry point
├── app.module.ts                # Root module
├── config/                      # Redis, S3 config
├── database/                    # Prisma service
├── common/                      # Shared utilities
│   ├── constants.ts             # Queue names, model config
│   ├── guards/                  # Auth guards
│   └── decorators/              # Custom decorators
└── modules/
    ├── auth/                    # JWT auth, registration
    ├── clients/                 # Client CRUD + branding
    ├── content/                 # Content requests & pieces
    ├── generation/              # AI workers (core)
    │   ├── ai-router.service    # Model selection per task
    │   ├── ai-cache.service     # Multi-level caching
    │   ├── prompt-builder       # Prompt templates per type
    │   ├── cost-tracker         # Token & cost tracking
    │   └── generation.worker    # BullMQ processor
    ├── templates/               # Visual templates
    ├── calendar/                # Scheduling
    ├── publishing/              # Social media publishing
    │   ├── publishing.service   # Platform connectors
    │   ├── publishing.worker    # Publish queue processor
    │   └── publishing.scheduler # Cron: check due posts
    └── analytics/               # Dashboard & cost reports
```

### Cost Optimization Strategy

1. **Model Routing**: Creative tasks → Sonnet, repetitive → Haiku (~60% cheaper)
2. **Multi-level Cache**: Exact match (Redis) → Semantic (PostgreSQL) → Templates
3. **Batch Processing**: Group same-client requests to share context
4. **Token Budgets**: Configurable per organization/plan
5. **Progressive Generation**: Generate 1, if approved, create variations with lite model
