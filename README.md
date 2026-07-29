# NaviWealth Admin Portal

NaviWealth's authenticated admin workspace for managing reusable event and
stock datasets.

## Features

- ChatGPT sign-in for protected admin pages and dataset actions
- Event and stock dataset libraries
- Event dataset detail pages with membership and rotation views
- Create, edit, duplicate, reuse, and delete workflows
- Supabase Postgres persistence with row-level security
- A protected Supabase Edge Function for server-to-server data access

## Local development

Requires Node.js 22 or later.

```bash
npm install
npm run dev
```

Create an ignored `.dev.vars` file for the server runtime:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
NAVIWEALTH_DB_GATEWAY_KEY=your-private-gateway-key
```

## Supabase

The database schema is versioned in `supabase/migrations`, and the protected
dataset gateway lives in `supabase/functions/naviwealth-datasets`.

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
npx supabase functions deploy naviwealth-datasets
```

The `datasets` table has RLS enabled and grants no access to anonymous or
authenticated Data API roles. The Edge Function uses Supabase's server-only
secret key and validates the app's private gateway key before accessing data.

## Validation

```bash
npm run build
npm test
```
