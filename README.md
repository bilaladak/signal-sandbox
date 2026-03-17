# Signal Sandbox

Investment decision support platform — scenario simulation, signal interpretation & multi-agent analysis.

## What is Signal Sandbox?

Signal Sandbox is a research assistant + scenario simulator + signal interpretation platform that:

- **Collects** news, company developments, macro data, and sector signals
- **Builds** a knowledge graph of relationships between assets, events, and themes
- **Simulates** how 10 different investor archetypes would react to events
- **Generates** bull/base/bear scenarios with confidence bands
- **Analyzes** portfolio-level impact and vulnerability
- **Produces** structured decision support reports (not recommendations)

> This is NOT a trading bot or investment advisor. It is a decision support tool.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Backend | NestJS 10, Node.js 22 |
| Database | PostgreSQL 16 + pgvector |
| Cache/Queue | Redis 7, BullMQ |
| AI | Provider-agnostic (OpenAI, Anthropic) |
| Infra | Docker Compose, Turborepo monorepo |

## Getting Started

### Prerequisites

- Node.js >= 20
- Docker & Docker Compose
- npm >= 10

### Setup

```bash
# Clone the repo
git clone https://github.com/bilaladak/signal-sandbox.git
cd signal-sandbox

# Install dependencies
npm install

# Start infrastructure (PostgreSQL + Redis)
docker compose -f docker/docker-compose.yml up -d

# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Start development servers
npm run dev
```

The API will be available at `http://localhost:3001/api/v1` and the frontend at `http://localhost:3000`.

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

## Project Structure

```
signal-sandbox/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   ├── shared-types/ # Shared TypeScript types
│   ├── tsconfig/     # Shared TS configs
│   └── eslint-config/# Shared ESLint config
├── docker/           # Docker Compose files
└── .github/          # CI/CD workflows
```

## License

MIT
