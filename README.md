# SEO Command Center

Agency-grade SEO dashboard with multi-tenant architecture, client-facing public reports, and manual data entry workflows.

**Stack:** Node.js 20 + Express 5 + MongoDB 7 + Next.js 14 + TypeScript + Tailwind CSS

---

## Architecture

```
seo-command-center/
├── apps/
│   ├── api/          → Express.js REST API (port 4000)
│   ├── web/          → Next.js frontend dashboard (port 3000)
│   └── worker/       → BullMQ background job processor
├── packages/
│   ├── shared-types/ → TypeScript interfaces shared across apps
│   └── validation/   → Zod schemas for request validation
├── docker-compose.yml
└── turbo.json
```

---

## Prerequisites

- **Node.js** ≥ 20.0.0
- **Docker** (for MongoDB + Redis) or local installations
- **Google OAuth** credentials (for authentication)

---

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd seo-command-center
npm install
```

### 2. Start Infrastructure

```bash
docker compose up -d
```

This starts MongoDB (port 27017) and Redis (port 6379).

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Required: Get from Google Cloud Console (OAuth 2.0)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret

# Generate random secrets (at least 32 characters each):
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
```

**Setting up Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application type)
3. Add `http://localhost:3000` to Authorized JavaScript Origins
4. Add `http://localhost:3000/auth/callback` to Authorized Redirect URIs
5. Copy Client ID and Secret into `.env`

### 4. Seed Demo Data

```bash
npm run db:seed
```

This creates a demo agency, users, project, tasks, keywords, and audit issues. **Edit the email addresses** in `apps/api/src/scripts/seed.ts` to match your Google account before seeding.

### 5. Start Development

```bash
# Start all apps simultaneously (via Turborepo):
npm run dev

# Or start individually:
npm run dev:api    # API on http://localhost:4000
npm run dev:web    # Frontend on http://localhost:3000
```

### 6. Open the Dashboard

Navigate to [http://localhost:3000](http://localhost:3000) and sign in with Google.

---

## API Endpoints

All API routes are prefixed with `/api/v1/`.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/auth/google` | No | Google OAuth sign-in |
| POST | `/auth/refresh` | Cookie | Refresh JWT token |
| POST | `/auth/logout` | Yes | Invalidate session |
| GET | `/auth/me` | Yes | Get current user + agency |
| GET/POST | `/projects` | Yes | List/create projects |
| GET/PATCH/DELETE | `/projects/:id` | Yes | Get/update/delete project |
| GET/POST | `/projects/:id/tasks` | Yes | List/create tasks |
| PATCH/DELETE | `/projects/:id/tasks/:taskId` | Yes | Update/delete task |
| GET/POST | `/projects/:id/keywords` | Yes | List/create keywords |
| POST | `/projects/:id/keywords/bulk` | Yes | Bulk import keywords |
| POST | `/projects/:id/keywords/snapshot` | Yes | Record new ranking data |
| GET/POST | `/projects/:id/audits` | Yes | List/create audit issues |
| GET/POST | `/projects/:id/approvals` | Yes | List/create approvals |
| PATCH | `/projects/:id/approvals/:aid/decide` | Yes | Approve/reject |
| GET/POST | `/projects/:id/reviews` | Yes | List/create reviews |
| GET | `/projects/:id/reports` | Yes | List report snapshots |
| POST | `/projects/:id/reports/generate` | Admin | Generate frozen report |
| PATCH | `/projects/:id/reports/:rid/revoke` | Admin | Revoke public link |
| GET | `/public/report/:token` | No | Fetch public report data |
| GET | `/dashboard/portfolio` | Admin | Cross-project overview |
| GET | `/dashboard/project/:id` | Yes | Project-level KPIs |
| GET | `/dashboard/workload` | Admin | Team workload view |

---

## Multi-Tenancy

Tenant isolation is enforced at three layers:

1. **JWT:** Every token contains `agencyId` (claim `aid`)
2. **Middleware:** `tenantScope` injects `agencyId` into all downstream code
3. **Repository/Query:** Every MongoDB query includes `agencyId` filter

All collections use compound indexes starting with `agencyId` for performance.

---

## Public Reports

Reports are **immutable snapshots** — once generated, data is frozen even if project data changes later.

- URL format: `/report/{nanoid_token}` (21-char cryptographic token)
- Served via Next.js ISR (static generation + CDN caching)
- Optional password protection (bcrypt-hashed)
- Revocable by admin at any time

---

## Development

```bash
# Type-check all packages:
npm run type-check

# Lint:
npm run lint

# Build all packages:
npm run build
```

### Project Structure (API)

Each module follows the pattern:
```
modules/{name}/
  ├── {name}.model.ts     → Mongoose schema + indexes
  └── {name}.routes.ts    → Express route handlers
```

Shared utilities:
```
shared/
  ├── AppError.ts         → Typed error class
  ├── BaseRepository.ts   → Tenant-scoped query helpers
  └── response.ts         → Standardized API responses
```

---

## Deployment

**Frontend:** Deploy to Vercel (zero-config Next.js hosting)
**API:** Deploy to Railway, Render, or AWS ECS
**Database:** MongoDB Atlas (M10+ for production)
**Redis:** Upstash or managed Redis
**Worker:** Same platform as API, separate service

See the System Architecture Document for detailed deployment guidance.

---

## License

Proprietary — All rights reserved.
