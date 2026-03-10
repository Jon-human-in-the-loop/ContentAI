# ContentAI 🤖✨

**ContentAI** is an AI-powered content generation SaaS platform designed specifically for social media agencies. It allows agencies to manage multiple clients, generate high-quality on-brand content using LLMs (Claude), schedule posts, and analyze API costs all in one unified dashboard.

![ContentAI Dashboard Concept](./docs/contentai-dashboard.html)

---

## 🚀 Key Features

*   **Multi-tenant Architecture:** Manage multiple organizations/agencies and their respective clients with specific "Brand Voice" profiles (tone, colors, prohibitions, styles).
*   **Intelligent Content Generation:** Uses an AI Orchestrator (Router) to dynamically select the best LLM model for the specific task (e.g., *Claude 3.5 Sonnet* for creative copywriting, *Haiku* for hashtag generation or formatting) to optimize API costs.
*   **Asynchronous Processing:** Built on **BullMQ** and **Redis** to handle heavy AI generation queues, rate limits, and fallback strategies silently in the background.
*   **Multi-Level AI Caching:** Implements Exact Match caching (Redis) and Semantic caching (PostgreSQL) to avoid regenerating identical or highly similar content, drastically reducing API costs.
*   **Automated Social Publishing:** Native integrations to publish directly to Meta Graph API (Instagram, Facebook), LinkedIn API, and X API.
*   **Cost Tracking & Analytics:** Real-time dashboard showing daily API costs, model breakdown usage, and token utilization per client.

---

## 🛠️ Tech Stack

**Frontend**
*   [Next.js 14](https://nextjs.org/) (App Router)
*   React & TypeScript
*   Tailwind CSS
*   [shadcn/ui](https://ui.shadcn.com/) (Radix UI) for accessible, beautiful components
*   Recharts for analytics graphics

**Backend**
*   [NestJS](https://nestjs.com/) (Node.js framework)
*   TypeScript
*   [Prisma ORM](https://www.prisma.io/)
*   PostgreSQL (Primary Database)
*   Redis (Caching & BullMQ)

**AI & Integrations**
*   Anthropic API (Claude 3.5 Sonnet & Haiku)
*   Meta Graph API, LinkedIn API, X API v2

---

## 📂 Repository Structure

This is a monorepo containing both the frontend and backend applications.

``` text
ContentIA/
├── apps/
│   ├── frontend/         # Next.js Web Application
│   │   ├── src/          # React components, pages, and hooks
│   │   └── package.json
│   │
│   └── backend/          # NestJS API & Workers
│       ├── prisma/       # Database schema and migrations
│       ├── src/
│       │   └── modules/  # Auth, Analytics, Clients, Content, Generation (AI workers), Publishing
│       └── package.json
│
├── docs/                 # Documentation and Design mockups
├── docker-compose.yml    # Infrastructure for local development (Redis, Postgres)
├── ARCHITECTURE.md       # Detailed system architecture and queues diagram
└── README.md             # This file
```

---

## 🏎️ Quick Start (Local Development)

### Prerequisites
*   Node.js 20+
*   Docker & Docker Compose (for PostgreSQL and Redis)
*   Anthropic API Key

### 1. Start Infrastructure
Run the database and Redis cache via Docker.
```bash
docker-compose up -d
```

### 2. Backend Setup
```bash
cd apps/backend
npm install
cp .env.example .env   # Configure your ANTHROPIC_API_KEY and database URL here
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

### 3. Frontend Setup
In a new terminal:
```bash
cd apps/frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to access the application.

---

## 📖 Architecture Deep Dive

For a complete understanding of the BullMQ worker pipelines, multi-level catching strategy, and the full DB schema, please refer to the [ARCHITECTURE.md](./ARCHITECTURE.md) document.

---

*Built for modern content agencies looking to scale their production without skyrocketing API costs.*
