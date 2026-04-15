# JetOps MVP

JetOps is a Next.js 16 MVP focused on operational NOTAM workflows for private
aviation teams.

## Features in this MVP

- Landing page with sign-in entry (`/` -> `/auth`)
- Host-based app routing (`app.{domain}` rewrites to internal `/app/*`)
- Supabase email/password authentication
- Organisation and aircraft management
- NOTAM PDF upload flow backed by a dummy processing API (`/api/notams/process`)

## Environment variables

Copy `.env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

## Local development

Install dependencies and run:

```bash
npm install
npm run dev
```

Open:

- `http://localhost:3000` for the marketing site
- `http://localhost:3000/app` for product routes fallback

Optional host-based testing:

1. Add hosts entries:
   - `127.0.0.1 jetops.local`
   - `127.0.0.1 app.jetops.local`
2. Visit:
   - `http://jetops.local:3000` (marketing)
   - `http://app.jetops.local:3000` (product)

## Quality checks

```bash
npm test
```
