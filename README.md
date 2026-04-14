# Vercel Sample App

This repository is a starter application built with `Next.js`, `React`, `Tailwind CSS`, and `PostgreSQL` for deployment on `Vercel`. It is meant to be reused as a base for new applications that already need a working layout, Vercel deployment flow, database bootstrap logic, and a simple runtime diagnostics screen.

The sample uses a PostgreSQL database hosted through `Vercel Postgres` / `Neon`, reads deployment settings from Vercel environment variables, bootstraps its schema through `/db_bootstrap`, and serves a landing page at `/` only when the database is ready.

## Description

The application demonstrates a simple but reusable pattern for Vercel-hosted apps:

- a `Next.js` App Router frontend
- a PostgreSQL connection created from environment variables injected by Vercel
- a bootstrap route that creates the schema and seeds sample data
- a landing page that reads metadata and records from the database
- a top navigation menu, theme switcher, and modal-based record details view

It is intentionally small so teams can clone it, rename it, adjust the data model, and start building a new app without recreating the deployment and database plumbing from scratch.

## Architecture

### Stack and versions

| Layer | Package / service | Version |
| --- | --- | --- |
| Frontend framework | `next` | `16.0.10` |
| UI runtime | `react` | `19.0.0` |
| UI runtime | `react-dom` | `19.0.0` |
| Styling | `tailwindcss` | `3.4.17` |
| CSS pipeline | `postcss` | `8.5.3` |
| CSS compatibility | `autoprefixer` | `10.4.20` |
| Language | `typescript` | `5.8.2` |
| Database driver | `pg` | `8.13.1` |
| Modal primitive | `@radix-ui/react-dialog` | `1.1.2` |
| Utility classes | `clsx` | `2.1.1` |
| Tailwind merge helper | `tailwind-merge` | `2.5.2` |
| Hosting | `Vercel` | managed platform |
| Database | `Vercel Postgres` backed by `Neon` | managed service |

### Main application files

| File | Responsibility |
| --- | --- |
| `app/page.tsx` | Landing page flow and redirects to bootstrap when the database is not ready |
| `app/db_bootstrap/page.tsx` | Bootstrap page that initializes or validates the schema and shows the current data |
| `app/api/health/route.ts` | Health endpoint for environment and database readiness |
| `lib/app-config.ts` | Central parameter file for `appName`, `dbVersion`, `appAuthor`, and `authorEmail` |
| `lib/env.ts` | Environment parsing and masked connection diagnostics |
| `lib/db.ts` | PostgreSQL pool creation and connectivity helpers |
| `lib/bootstrap.ts` | Schema creation, initial seed, snapshot loading, and future migration hook |
| `lib/landing.ts` | Landing page queries and readiness checks |

### Database connection and environment variables

The application resolves the database connection in this order:

1. `DATABASE_URL`
2. `POSTGRES_URL`

When the project is connected to `Vercel Postgres`, Vercel can automatically inject the database connection string into the project settings. The app reads that value in `lib/env.ts`, masks secrets for display, and exposes connection diagnostics on the landing page and in `/api/health`.

In `lib/db.ts`, the PostgreSQL pool is created from that connection string. In production, SSL is enabled through the `pg` client configuration with `rejectUnauthorized: false`, which matches common Vercel-hosted PostgreSQL usage.

Required runtime variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes, unless `POSTGRES_URL` exists | Primary PostgreSQL connection string |
| `POSTGRES_URL` | Optional fallback | Alternate connection string, commonly injected by Vercel |
| `APP_NAME` | Yes | Runtime app display name |
| `DB_VERSION` | Yes | Target schema version used by bootstrap and readiness checks |

### Parameter file

The project-level parameter file is `lib/app-config.ts`.

It contains:

- `appName`
- `dbVersion`
- `appAuthor`
- `authorEmail`

`appName` and `dbVersion` are read from `APP_NAME` and `DB_VERSION` when those variables are present. `appAuthor` and `authorEmail` are currently defined directly in the file as defaults for the footer and project identity.

### Database model

The sample schema contains two tables:

#### `app_meta`

Stores application metadata and database version control.

| Column | Type | Purpose |
| --- | --- | --- |
| `prop` | `char(20)` | Primary key |
| `string_value` | `char(100)` | String metadata value |
| `double_value` | `real` | Numeric metadata value |
| `int_value` | `int` | Integer metadata value |

Important keys:

- `app_name`
- `db_version`

Keep `app_meta`. It is required by the database update logic.

#### `app_data`

Stores the sample records displayed on the landing page and bootstrap screen.

| Column | Type | Purpose |
| --- | --- | --- |
| `small_str` | `char(20)` | Primary key and short label |
| `large_str` | `char(256)` | Descriptive text |
| `num` | `real` | Sample metric |
| `dt` | `timestamp` | Date and time field |

## Operation

### Environment setup

1. Create your own repository based on the original project: [rafaelalcantaradepaula/vercel-sample-app](https://github.com/rafaelalcantaradepaula/vercel-sample-app).
2. Clone your repository locally.
3. Install dependencies with `npm install`.
4. Create `.env.local` from `.env.example` for local development.
5. In Vercel, create a new project and connect it to your GitHub repository.
6. In the Vercel project, create or attach a `Neon` database through `Vercel Postgres`.
7. Confirm that Vercel injects `DATABASE_URL` or `POSTGRES_URL`.
8. Add `APP_NAME` and `DB_VERSION` to `Preview` and `Production`.
9. Open `/db_bootstrap` after the first deploy so the schema can be created and seeded.
10. Open `/` and `/api/health` to verify the app is ready.

### Local development

Useful commands:

```bash
npm install
npm run dev
npm run build
npm run check:deployment
```

`npm run check:deployment` validates the presence of the required deployment variables before you push to Vercel.

## Deploy

Vercel handles deployment automatically from Git:

- pushing to `main` creates the production deployment
- pushing any other branch creates a preview deployment that acts as staging

Recommended staging model:

- production uses the production database connection string
- preview uses a separate Neon branch or cloned database seeded from production

That preview database copy is not created by the application code itself. It must be configured in `Vercel` / `Neon` as part of your environment strategy. Once configured, every non-`main` push can build against staging with its own database URL.

Suggested deployment sequence:

1. Push code to GitHub.
2. Let Vercel build the corresponding environment automatically.
3. Verify the environment variables for that deployment.
4. Run `/db_bootstrap` if the target database is empty or newly cloned.
5. Check `/api/health`.
6. Open `/` and validate the landing page.

## Vibecoding development

When using this repository as the base for a new application, start by updating the values in `lib/app-config.ts`:

- `appName`
- `dbVersion`
- `authorEmail`
- `appAuthor`

Important notes:

- `appName` and `dbVersion` can be overridden by `APP_NAME` and `DB_VERSION`
- `authorEmail` and `appAuthor` are currently file-based values, not environment variables

The data model bootstrap lives in `lib/bootstrap.ts`:

- schema creation happens through the bootstrap flow, mainly `recreateSchema()` and `seedInitialData()`
- `app_meta` must be preserved because it controls database version logic
- schema updates must be implemented in `updateDb()`
- for an update to run, the value of `$DB_VERSION` must be higher than the version stored in `app_meta`

At the moment, `updateDb()` is a placeholder and returns `false`. When you change the schema, implement the migration steps there and bump `DB_VERSION`.

Suggested prompt for requesting changes from an AI:

```text
draw a new implementation plan to create a new application based on the current app acording to instructions bellow. Keep same layout and design paterns and do not change db_bootstrap logic at the landing page.
```

## Application

### Landing page flow

The landing page is `/`.

Its behavior is:

1. Read the active database environment.
2. Redirect to `/db_bootstrap` if no database URL is configured.
3. Check whether `app_meta` and `app_data` exist and whether `app_meta.db_version` matches `DB_VERSION`.
4. Redirect to `/db_bootstrap` if the schema is missing or outdated.
5. Load `app_name`, `db_version`, and `app_data`.
6. Render a dashboard with connection diagnostics and cards for the `app_data` rows.

### `db_bootstrap` flow

The bootstrap page is `/db_bootstrap`.

Its behavior is:

1. Refuse to run if no database connection string exists.
2. Inspect whether `app_meta` and `app_data` exist.
3. Recreate the schema and seed initial data when the tables are missing.
4. Recreate the schema when `db_version` is missing from `app_meta`.
5. Call `updateDb()` when the stored version differs from the configured version.
6. Show the resulting contents of `app_meta` and `app_data` in table form.

### Top menu

The top menu is fixed across the whole application and includes:

- a dropdown menu with shortcuts to `/` and `/db_bootstrap`
- a theme toggle that stores the selected theme in `localStorage`
- a footer badge with the author name and email link

### Color palette

The UI uses two coordinated palettes defined in `app/globals.css`.

Dark theme:

- deep navy backgrounds such as `#060814`, `#0b1126`, and `#120a24`
- indigo and blue panels such as `#0e1730` and `#162348`
- violet and lilac accents such as `#bd90ff` and `#7453c8`

Light theme:

- soft lavender and ice-blue backgrounds such as `#f3efff`, `#edf4ff`, and `#e6f0ff`
- white and pale blue surfaces such as `#ffffff` and `#edf2ff`
- blue accent colors such as `#4a5de0` and `#2f7cff`

Across both themes, the design relies on gradient backgrounds, translucent toolbar surfaces, rounded panels, and strong contrast badges for environment and database status.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Main landing page |
| `/db_bootstrap` | Schema bootstrap, seed, and database snapshot screen |
| `/api/health` | Readiness endpoint for environment and database checks |

## Additional documentation

- [docs/deployment-plan.md](docs/deployment-plan.md)
- [docs/setup.md](docs/setup.md)
