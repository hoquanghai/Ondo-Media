# CLAUDE.md

## Project Overview

Nippo is an internal social network system for Ondo Metals Co., Ltd., serving 100–150 employees. Built with NestJS microservices (backend) and Next.js 15 (frontend), deployed on-premises + VPN via Docker Compose. **All UI text must be in Japanese.**

---

## AI Skills & Plugins

### Skills (`.claude/skills/`)
| Skill | Trigger | Description |
|-------|---------|-------------|
| `code-review` | Code review request | Backend/Frontend review checklist |
| `add-feature` | New feature request | Feature spec → Implementation workflow |
| `fix-bug` | Bug report | Debug patterns & common fixes |
| `refactor` | Refactoring request | Code cleanup rules |
| `frontend-design` | UI design | Design system, Figma reference, responsive rules |
| `database` | DB operations | Schema changes, migrations, cross-DB queries |

### Installed Plugins
- **code-review** — Automated code review with project-specific checklist
- **context7** — Enhanced context awareness
- **frontend-design** — UI/UX design assistance with Figma
- **github** — PR creation, issue management
- **superpowers** — Advanced code generation

### MCP Connections
- **Figma** — Design reference access
- **Gmail** — Communication
- **Google Calendar** — Scheduling

### Tools (`tools/`)
- `tools/scripts/dev-setup.sh` — One-command dev environment setup
- `tools/scripts/reset-db.sh` — Database reset & re-migration
- `tools/prompts/new-feature.md` — Prompt template for new features
- `tools/prompts/fix-bug.md` — Prompt template for bug reports

---

## Repository Layout

```
Internal_Social/
├── CLAUDE.md                          ← This file (AI guide)
├── PROJECT_REQUIREMENTS.md            ← Project requirements
├── docs/
│   ├── 00-project-init/
│   │   └── README.md                 ← Project initialization checklist
│   ├── 01-system-design/             ← System design documents
│   │   ├── shared/
│   │   │   └── conventions.md        ← Coding & naming conventions
│   │   ├── backend/
│   │   │   ├── database-schema.md    ← DB schema (DDL & indexes)
│   │   │   ├── api-endpoints.md      ← Full REST API specification
│   │   │   ├── microservices.md      ← Microservice architecture
│   │   │   └── caching-strategy.md   ← Redis caching strategy
│   │   └── frontend/
│   │       ├── nextjs-architecture.md ← Next.js App Router structure
│   │       ├── routing.md            ← Routing design
│   │       └── screen-inventory.md   ← Screen inventory
│   ├── 02-backend/                   ← Backend implementation guide (by phase)
│   │   ├── phase-01-foundation/
│   │   ├── phase-02-auth/
│   │   ├── phase-03-user-management/
│   │   ├── phase-04-timeline/
│   │   ├── phase-05-announcements/
│   │   ├── phase-06-survey/
│   │   ├── phase-07-notifications/
│   │   └── phase-08-file-service/
│   ├── 03-frontend/                  ← Frontend implementation guide (by phase)
│   │   ├── phase-01-setup/
│   │   ├── phase-02-auth/
│   │   ├── phase-03-layout/
│   │   ├── phase-04-timeline/
│   │   ├── phase-05-announcements/
│   │   ├── phase-06-survey/
│   │   ├── phase-07-my-page/
│   │   ├── phase-08-admin/
│   │   └── phase-09-notifications/
│   ├── 04-testing/
│   │   └── README.md                ← Testing strategy
│   ├── 05-deployment/
│   │   └── README.md                ← Deployment guide
│   └── features/                     ← Future feature specs
│       ├── teams-integration/spec.md
│       ├── gamification/spec.md
│       └── ai-features/spec.md
└── source/                           ← Source code
    ├── backend/                      ← NestJS backend
    └── frontend/                     ← Next.js frontend
```

---

## Common Commands

### Backend

```bash
cd source/backend

npm run dev              # Start dev server (API Gateway)
npm run dev:all          # Start all microservices
npm test                 # Run tests
npm run build            # Build
npm run db:migrate       # Run migrations
npm run db:migrate:generate  # Generate migration
npm run db:seed          # Seed initial data
npm run infra:up         # Start Docker infra (SQL Server, Redis, MinIO)
npm run infra:down       # Stop Docker infra
```

### Frontend

```bash
cd source/frontend

npm run dev              # Start dev server (http://localhost:3001)
npm run build            # Production build
npm test                 # Run tests
npm run lint             # Run lint
```

---

## Architecture Summary

### Backend

- **NestJS microservices** with TCP transport for internal communication
- API Gateway receives HTTP requests and forwards to microservices via TCP
- Services: API Gateway, Auth Service, Post Service, Notification Service, File Service
- TypeORM connecting to SQL Server 2022 (Japanese_CI_AS collation)
- Redis for session management & caching
- MinIO for file/image storage
- Socket.IO for real-time notifications

### Frontend

- **Next.js 15** App Router (Server Components + Client Components)
- **Tailwind CSS** + **shadcn/ui** for UI
- **TanStack Query** for server state management
- **Zustand** for client state management (auth, notification badges, etc.)
- Responsive design (desktop, tablet, mobile)

### Database

- SQL Server 2022 (Japanese_CI_AS collation)
- Managed via TypeORM migrations (`synchronize: false`)
- Soft delete (`is_deleted` column) — hard delete is prohibited
- All tables have `created_at`, `updated_at`, `created_by`, `is_deleted` columns
- Primary keys are `UNIQUEIDENTIFIER` (`NEWID()`)

### Infrastructure

- Docker Compose manages all services
- Nginx reverse proxy (SSL termination)
- On-premises server + VPN access only

---

## Auth Flow

Two authentication methods supported:

1. **Local auth**: Email + password (bcrypt hashed)
2. **Microsoft 365 SSO**: OAuth 2.0 / OIDC via Azure AD

```
[User] → [Next.js] → [API Gateway] → [Auth Service]
                                           │
                                           ├─ Local: email/password → issue JWT
                                           └─ SSO: Azure AD → JIT user creation → issue JWT

JWT: Access token (15 min) + Refresh token (7 days)
```

---

## Key Conventions

See `docs/01-system-design/shared/conventions.md` for full details. Key points:

- **DB**: Table names in snake_case plural, column names in snake_case
- **API**: `/api/v1/{resource}` format, kebab-case
- **Code**: Classes in PascalCase + suffix, files in kebab-case
- **JSON**: Properties in camelCase, dates in ISO 8601
- **Git**: Conventional Commits (e.g. `feat(post): add post creation feature`)

---

## Mandatory Rules

### 1. Using Skills & Plugins is REQUIRED

When receiving any new task or feature request, you **MUST use the relevant Skills and Plugins**. This is **not optional** — it is an absolute requirement.

| Task Type | Required Skill / Plugin |
|-----------|------------------------|
| New feature | `add-feature` skill → `superpowers:brainstorming` → `superpowers:writing-plans` |
| Bug fix | `fix-bug` skill → `superpowers:systematic-debugging` |
| Code review | `code-review` skill → `superpowers:requesting-code-review` |
| Refactoring | `refactor` skill |
| UI design & implementation | `frontend-design` skill → Figma MCP |
| DB operations | `database` skill |
| Executing implementation plans | `superpowers:executing-plans` → `superpowers:subagent-driven-development` |
| Before completing work | `superpowers:verification-before-completion` |

**You must NEVER skip a skill based on your own judgment.** Reasoning like "it's simple enough" or "I can do it quickly without a skill" is prohibited.

### 2. Re-reading Documentation on Context Loss is REQUIRED

When the conversation grows long and you lose track of or become uncertain about any of the following, you **MUST re-read the relevant documentation**:

| Lost Context | File(s) to Re-read |
|-------------|---------------------|
| Overall project structure & requirements | `PROJECT_REQUIREMENTS.md`, `CLAUDE.md` |
| System design & architecture | Files under `docs/01-system-design/` |
| DB schema & table design | `docs/01-system-design/backend/database-schema.md` |
| API specification | `docs/01-system-design/backend/api-endpoints.md` |
| Microservice architecture | `docs/01-system-design/backend/microservices.md` |
| Frontend screen design | `docs/01-system-design/frontend/screen-inventory.md` |
| Coding conventions | `docs/01-system-design/shared/conventions.md` |
| Backend implementation steps | Relevant phase under `docs/02-backend/` |
| Frontend implementation steps | Relevant phase under `docs/03-frontend/` |
| Future feature specs | Files under `docs/features/` |

**You must NEVER continue working based on "I think I remember" or "it's probably correct."** If uncertain, always open and read the documentation.

### 3. Task Start Checklist

When starting any new task, you **MUST** follow these steps in order:

1. **Invoke the relevant Skill** — Use the `Skill` tool to activate the appropriate skill for the task type
2. **Read the design documents** — Read the relevant files under `docs/01-system-design/`
3. **Read the phase guide** — Read the relevant phase under `docs/02-backend/` or `docs/03-frontend/`
4. **Check conventions** — Verify compliance with `docs/01-system-design/shared/conventions.md`
5. **Begin implementation** — Only start writing code after completing all steps above

---

## Important Notes

1. **Read design docs first** — Always review the relevant documents in `docs/01-system-design/` before implementation
2. **Follow phase guides** — Follow the phase-specific READMEs in `docs/02-backend/` and `docs/03-frontend/`
3. **All UI text in Japanese** — Buttons, labels, messages, error displays — everything must be in Japanese
4. **Future feature specs in `docs/features/`** — Contains specs for Teams integration, gamification, AI features
5. **Do not change shared library patterns** — Do not modify shared patterns (response wrappers, error filters, guards, etc.) without checking `conventions.md`
6. **Enforce soft delete** — Use `is_deleted` flag for soft deletion; hard delete is strictly prohibited
7. **Manage via migrations** — `synchronize: true` is forbidden; all schema changes must go through migrations
