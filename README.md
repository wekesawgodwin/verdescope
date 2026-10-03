# Verde-Scope Africa — website & portal

Public website, stakeholder portal, staff CMS and company mailbox for **Verde-Scope Africa Limited**.

| Layer | Stack |
|---|---|
| Frontend | React 18 + TypeScript (Vite), installable **PWA** (offline public pages, app icons, update prompt) |
| Backend | **FastAPI**, SQLAlchemy 2, Alembic migrations, JWT auth |
| Database | **PostgreSQL 16** |
| Packaging | One **Docker** image: FastAPI serves `/api/*`, `/uploads/*` and the built PWA |
| CI/CD | GitHub Actions → tests, image build (GHCR) → deploy to **Railway** |

```
backend/     FastAPI app (app/), Alembic migrations, tests
frontend/    React PWA (src/site = public pages, src/portal = dashboards)
Dockerfile   multi-stage build (node → python)
docker-compose.yml   local full stack with Postgres
railway.json         Railway build/deploy config
prototype/   the original static MVP (kept for reference; safe to delete)
brand/       full-resolution transparent logos
```

## Features

- **Public site**: home, about, services, gallery (photos & videos grouped by event), blog, contact form.
- **Portal** (`/portal`), role-based:
  - **Stakeholder**: project progress & milestones, secure report downloads, messaging the team.
  - **Website manager**: company email (inbox, replies, compose, sent), blog posts, gallery events with photo/video upload, services.
  - **Super admin**: everything above, plus users & roles, stakeholder projects & document sharing, site settings, activity log, data export.
- **Company email**: website inquiries and stakeholder messages land in the inbox. Replies are sent through **Resend** or any **SMTP** server and recorded with a delivery status.

## Run locally

**Quickest: everything in Docker.** This builds the image exactly as Railway will, with demo data and demo logins enabled:

```bash
docker compose up --build        # http://localhost:8000
```

**Development with hot reload:**

```bash
# 1. Postgres
docker run -d --name verdescope-pg -e POSTGRES_USER=verdescope -e POSTGRES_PASSWORD=verdescope -e POSTGRES_DB=verdescope -p 5433:5432 postgres:16-alpine

# 2. API (http://localhost:8000, docs at /api/docs)
cd backend
python -m venv .venv && .venv/Scripts/activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
alembic upgrade head && python -m app.seed
uvicorn app.main:app --reload

# 3. Web (http://localhost:5173, proxies /api to :8000)
cd frontend && npm install && npm run dev
```

Demo accounts (seeded when `SEED_DEMO=true`; the one-click buttons appear in dev builds or when `VITE_SHOW_DEMO_LOGINS=true`):

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@verdescope.demo | admin123 |
| Website Manager | manager@verdescope.demo | manager123 |
| Stakeholder | stakeholder@verdescope.demo | partner123 |

**Tests:** `cd backend && pytest`. Tests use a separate `verdescope_test` database, created automatically.

**New migration after changing models:** `alembic revision --autogenerate -m "describe change"`. CI runs `alembic check` and fails if models and migrations drift.

## Deploying to Railway

1. **Create the project.** Railway → *New Project* → *Deploy from GitHub repo* → select this repo. `railway.json` tells Railway to build the `Dockerfile` and health-check `/api/health`.
2. **Add Postgres.** In the project: *New* → *Database* → *PostgreSQL*.
3. **Add a volume for uploads.** On the web service: *Settings* → *Volumes* → mount at **`/data`**.
4. **Set variables** on the web service:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `SECRET_KEY` | a long random string (e.g. `openssl rand -hex 32`) |
   | `RAILWAY_RUN_UID` | `0` (lets the container write to the mounted volume) |
   | `SEED_DEMO` | `true` for a demo environment, `false` for production |
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD` | first admin account (production) |
   | `VITE_SHOW_DEMO_LOGINS` | `true` only on a demo environment |
   | `EMAIL_PROVIDER` | `resend` (recommended on Railway) or `smtp` |
   | `MAIL_FROM` | verified sender, e.g. `info@verdescope.co.ke` |
   | `RESEND_API_KEY` | when using Resend |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | when using SMTP (Railway allows outbound SMTP on Pro plans only) |

5. **Networking:** *Settings* → *Generate domain*, or add the company's custom domain.

On every start the container runs `alembic upgrade head`, seeds an empty database, then starts Uvicorn.

### CI/CD

`.github/workflows/ci.yml` runs on every push and PR:

1. **Backend:** ruff, migrations apply + `alembic check`, pytest against Postgres.
2. **Frontend:** typecheck and production build.
3. **Docker:** builds the image; on `main` it pushes it to `ghcr.io/<owner>/verdescope`.
4. **Deploy (main only):** runs `railway up` for the service.

Choose **one** deploy path:

- **A. Railway GitHub integration (simplest).** Leave `RAILWAY_TOKEN` unset (the deploy job skips itself). In the Railway service, turn on *Wait for CI* so Railway deploys only after the workflow passes.
- **B. Deploy from GitHub Actions.** Disconnect the repo's auto-deploy in Railway, create a *Project token*, add it as the repository secret `RAILWAY_TOKEN`, and set the repository variable `RAILWAY_SERVICE` to the service name.

## Email setup (company mailbox)

1. Get the company domain `verdescope.co.ke` (available on KeNIC as of 3 Oct 2026; see the Client Notes page for costs).
2. Pick a provider:
   - **Resend:** verify the domain (DNS records), create an API key, then set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` and `MAIL_FROM`.
   - **SMTP** (Google Workspace / Microsoft 365 / Zoho): set `EMAIL_PROVIDER=smtp` plus the `SMTP_*` variables. Use an app password.
3. In *Portal → Settings*, set the company reply-to address and email signature.

Until a provider is configured, replies are stored in the portal and marked **Not delivered**.

## Content notes

- Photos in `frontend/public/assets/img/projects/` come from the 2026 company profile.
- Gallery events flagged **Sample imagery** use Wikimedia Commons photos (credits in `frontend/public/assets/img/stock/CREDITS.json` and shown in the gallery). Replace them with Verde-Scope event photos via *Portal → Gallery*.
- The two highlight videos were generated from those photos.
