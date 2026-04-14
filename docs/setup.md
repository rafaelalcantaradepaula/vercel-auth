# Vercel Setup Guide

## Overview

This project is a sample Next.js application designed to run on Vercel with a Vercel Postgres database.

The application:

- renders a landing page with metadata loaded from the database
- bootstraps the database automatically when the schema is missing or outdated
- exposes a bootstrap page at `/db_bootstrap`
- exposes a readiness endpoint at `/api/health`
- provides a top navigation dropdown and a theme toggle on every screen

## Prerequisites

Before deploying, make sure you have:

- a Git repository containing this project
- access to a Vercel account
- permission to create or attach a Vercel Postgres database

## Create the Vercel Project

1. Open the Vercel dashboard.
2. Import the Git repository.
3. Let Vercel detect the framework as `Next.js`.
4. Keep the default root directory unless your repository layout changes.
5. Save the project.

## Attach the Database

1. Open the project in Vercel.
2. Go to the `Storage` section.
3. Create or attach a `Vercel Postgres` database.
4. Confirm that Vercel adds the database connection string to the project environment.

The application supports either:

- `DATABASE_URL`
- `POSTGRES_URL`

`DATABASE_URL` takes precedence when both are present.

## Configure Environment Variables

Create the following environment variables in both `Preview` and `Production`:

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes, unless `POSTGRES_URL` is used | `postgres://user:password@host:5432/db` | Primary database connection string |
| `POSTGRES_URL` | Optional fallback | Value provided by Vercel Postgres | Used only when `DATABASE_URL` is not set |
| `APP_NAME` | Yes | `Vercel NextJs sample` | Application display name |
| `DB_VERSION` | Yes | `1.0` | Target schema version |

## Recommended Vercel Settings

- Framework preset: `Next.js`
- Install command: `npm install`
- Build command: `npm run build`
- Node version: use the project or Vercel default that matches Next.js 16 support

## Deployment Flow

1. Push the branch you want to deploy.
2. Let Vercel create a Preview deployment.
3. Confirm the environment variables are available.
4. Open `/db_bootstrap` if the database has not been initialized yet.
5. Open `/` to verify the landing page.
6. Promote or merge to deploy to Production.

## Verification Checklist

Run these checks after deployment:

1. Open `/api/health` and confirm the response returns `ok: true`.
2. Open `/db_bootstrap` and confirm the tables load correctly.
3. Open `/` and confirm the landing page shows the application name.
4. Confirm the landing page shows the database version.
5. Confirm the landing page shows the connection diagnostics cards.
6. Confirm the landing page shows the `app_data` cards with modal details.
7. Confirm the top menu dropdown links to `/` and `/db_bootstrap`.
8. Confirm the light and dark theme toggle works on both pages.

## Local Validation

You can validate the environment locally with:

```bash
npm run check:deployment
```

If the required variables are missing, the command exits with a failure status and explains what is missing.

## Troubleshooting

### Missing database variables

If `/api/health` returns an error about the database URL:

- verify `DATABASE_URL` or `POSTGRES_URL` exists in Vercel
- confirm the variable is enabled for the environment you are testing

### Bootstrap redirects from the home page

If `/` redirects to `/db_bootstrap`:

- verify the database is reachable
- verify `app_meta` and `app_data` exist
- verify `app_meta.db_version` matches `DB_VERSION`

### Build validation in restricted environments

If `npm install` or `npm run build` cannot run from a locked-down environment, perform the validation inside Vercel or from a machine with npm registry access.
