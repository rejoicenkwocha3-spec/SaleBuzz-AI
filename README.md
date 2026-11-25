# SalesBuzz AI

AI powered B2B sales intelligence platform. Next.js 15, TypeScript, Tailwind, Supabase (Auth, Postgres, RLS).

## Go live in 6 steps

1. **Run the database migration** (safe for an existing Supabase project: every object is prefixed `sb_` and nothing you already have is touched).
   Supabase dashboard > SQL Editor > paste `supabase/migrations/0001_salesbuzz_schema.sql` > Run.
2. **Supabase Auth settings** (Authentication > URL Configuration):
   - Site URL: your production URL, for example `https://salesbuzz.yourdomain.com`
   - Redirect URLs: add `https://YOUR_DOMAIN/auth/callback` and `http://localhost:3000/auth/callback`
   - Authentication > Providers > Email: keep "Confirm email" ON for production.
3. **Create `.env.local`** from `.env.example` (and set the same variables on your host). Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`. For AI: `ANTHROPIC_API_KEY`. For billing: `SELAR_WEBHOOK_SECRET`, `ADMIN_EMAILS`.
4. **Deploy to Vercel**: import this GitHub repo, add the environment variables, deploy. (`npm run build` is the build command.)
5. **Selar webhook**: in your Selar account add a webhook pointing to `https://YOUR_DOMAIN/api/selar/webhook?secret=YOUR_SELAR_WEBHOOK_SECRET`. Make a test purchase, then look at the row in the `sb_payment_events` table. Selar's payload field names are read defensively; if your first real event is not matched, adjust the mapping at the top of `src/app/api/selar/webhook/route.ts`.
6. **Smoke test**: sign up, confirm the email, sign in, add a lead, send a signal (Integrations > Webhooks), ask the assistant.

Local: `npm install && npm run dev`.

## How things work

- **Auth**: Supabase Auth with email and password, verification, password reset, session cookies refreshed in `src/middleware.ts`. `/dashboard/*` is protected.
- **Workspaces**: each signup creates a workspace and an owner membership (trigger `sb_on_auth_user_created`). Existing users in your old project get one on first sign in (`sb_ensure_workspace`). Every business row has `workspace_id` and RLS limits it to members. Roles: owner, admin, member, viewer.
- **Secrets**: integration credentials live in `sb_integration_secrets`, which has RLS enabled and no policies, so only the server (service role) can read them.
- **Billing**: access activates only from a verified Selar webhook (shared secret) or an admin approving a manual claim. Checkout links never grant access. AI features require an active plan or an email in `ADMIN_EMAILS`.
- **AI**: `src/lib/ai/provider.ts` (Anthropic or any OpenAI compatible API). Calls are server side, use the signed in user's RLS bound data, are rate limited, logged to `sb_ai_usage`, and capped by `AI_DAILY_LIMIT`. The AI has no web access; reports label gaps and inferences.
- **Signals**: `POST /api/signals/ingest` with header `x-salesbuzz-key` (key shown to owners and admins in Integrations). Works with Segment, Zapier, or any HTTP client.

## Known limitations

- Integrations that work: webhooks (Segment, Zapier), HubSpot (private app token), Slack (incoming webhook), outbound webhook, CSV. Salesforce, Google Sheets, Google Analytics and email platforms need OAuth apps and are shown as "Needs setup", never as connected.
- No external prospect database is connected. Discovery searches your own workspace data; import from a provider you are licensed to use.
- Rate limiting is in memory per server instance. Use a shared store (for example Upstash) for strict limits at scale.
- Team invitations attach when the invited person signs up with the same email; no invitation email is sent.
- Only one logo direction was built (the connected S mark), in `public/brand/`.
