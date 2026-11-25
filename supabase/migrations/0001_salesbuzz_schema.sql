-- SalesBuzz AI schema. Every object is prefixed "sb_" so it is safe to run inside an existing
-- Supabase project: it never touches tables you already have. Safe to run more than once.

-- ============ Core identity ============
create table if not exists public.sb_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);
create table if not exists public.sb_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  ingest_key text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  preferences jsonb not null default '{}'::jsonb,
  scoring jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.sb_workspace_members (
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  role text not null default 'member' check (role in ('owner','admin','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create table if not exists public.sb_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin','member','viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

-- ============ CRM ============
create table if not exists public.sb_companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  name text not null, website text, industry text, size text, location text, revenue_range text,
  technologies text, is_account boolean not null default false, account_tier text,
  owner_id uuid references auth.users(id) on delete set null,
  notes text, source text, tags text[] not null default '{}', custom jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.sb_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  company_id uuid references public.sb_companies(id) on delete set null,
  first_name text not null, last_name text, email text, phone text, job_title text, department text,
  seniority text, linkedin_url text, consent_status text not null default 'unknown',
  owner_id uuid references auth.users(id) on delete set null,
  tags text[] not null default '{}', custom jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.sb_leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  company_id uuid references public.sb_companies(id) on delete set null,
  name text not null, email text, company_name text, job_title text, department text, seniority text,
  industry text, company_size text, location text, revenue_range text, technologies text,
  source text, status text not null default 'new', intent text not null default 'unknown',
  score int not null default 0, score_reason jsonb not null default '[]'::jsonb,
  owner_id uuid references auth.users(id) on delete set null,
  tags text[] not null default '{}', custom jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.sb_opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  company_id uuid references public.sb_companies(id) on delete set null,
  name text not null, stage text not null default 'qualification', value numeric not null default 0,
  probability int not null default 10, close_date date,
  owner_id uuid references auth.users(id) on delete set null, notes text, source text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.sb_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  title text not null, kind text not null default 'task', status text not null default 'open',
  due_at timestamptz, entity_type text, entity_id uuid,
  assignee_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.sb_activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  entity_type text not null, entity_id uuid not null,
  kind text not null default 'note', body text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.sb_enrichments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  entity_type text not null, entity_id uuid not null,
  field text not null, value text not null, source text not null,
  reviewed boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table if not exists public.sb_lists (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  name text not null, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.sb_list_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  list_id uuid not null references public.sb_lists(id) on delete cascade,
  lead_id uuid not null references public.sb_leads(id) on delete cascade,
  unique (list_id, lead_id)
);
create table if not exists public.sb_saved_searches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  name text not null, filters jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============ Signals ============
create table if not exists public.sb_signals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  lead_id uuid references public.sb_leads(id) on delete cascade,
  company_id uuid references public.sb_companies(id) on delete cascade,
  type text not null, title text not null, strength int not null default 50 check (strength between 0 and 100),
  source text not null default 'manual', occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.sb_signal_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  name text not null, signal_type text not null, min_strength int not null default 0,
  boost int not null default 10, set_intent text, enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ AI ============
create table if not exists public.sb_ai_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  company_id uuid references public.sb_companies(id) on delete set null,
  company_name text not null, content jsonb not null, sources jsonb not null default '[]'::jsonb,
  model text, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.sb_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation', created_at timestamptz not null default now()
);
create table if not exists public.sb_ai_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  conversation_id uuid not null references public.sb_ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')), content text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.sb_ai_usage (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  feature text not null, model text, input_tokens int not null default 0, output_tokens int not null default 0,
  created_at timestamptz not null default now()
);

-- ============ Automation, integrations, notifications ============
create table if not exists public.sb_workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  name text not null, trigger text not null, conditions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb, status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.sb_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  workflow_id uuid not null references public.sb_workflows(id) on delete cascade,
  status text not null, log jsonb not null default '[]'::jsonb, error text,
  created_at timestamptz not null default now()
);
create table if not exists public.sb_notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, body text, link text, read boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.sb_integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  provider text not null, status text not null default 'disconnected',
  config jsonb not null default '{}'::jsonb, last_synced_at timestamptz, last_error text,
  created_at timestamptz not null default now(), unique (workspace_id, provider)
);
-- Secrets: RLS on, NO policies. Only the server (service role) can read or write.
create table if not exists public.sb_integration_secrets (
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  provider text not null, secret text not null, primary key (workspace_id, provider)
);
create table if not exists public.sb_audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.sb_workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null, entity text, entity_id text, meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============ Billing ============
create table if not exists public.sb_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null, amount numeric, status text not null default 'active',
  source text not null default 'selar_webhook', external_ref text,
  started_at timestamptz not null default now(), current_period_end timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.sb_payment_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique, email text, amount numeric, currency text,
  status text not null default 'verified', payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.sb_payment_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text, plan text not null, order_ref text not null, status text not null default 'pending',
  created_at timestamptz not null default now()
);
create table if not exists public.sb_contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text not null, company text, message text not null,
  created_at timestamptz not null default now()
);

-- ============ Helpers ============
create or replace function public.sb_role(ws uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from public.sb_workspace_members where workspace_id = ws and user_id = auth.uid();
$$;
create or replace function public.sb_is_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sb_workspace_members where workspace_id = ws and user_id = auth.uid());
$$;
create or replace function public.sb_shares_workspace(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sb_workspace_members a join public.sb_workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = auth.uid() and b.user_id = uid);
$$;

-- ============ Row Level Security ============
alter table public.sb_profiles enable row level security;
alter table public.sb_workspaces enable row level security;
alter table public.sb_workspace_members enable row level security;
alter table public.sb_invites enable row level security;
alter table public.sb_integration_secrets enable row level security;
alter table public.sb_payment_events enable row level security;
alter table public.sb_contact_messages enable row level security;
alter table public.sb_subscriptions enable row level security;
alter table public.sb_payment_claims enable row level security;
alter table public.sb_notifications enable row level security;

drop policy if exists sb_profiles_read on public.sb_profiles;
create policy sb_profiles_read on public.sb_profiles for select using (id = auth.uid() or public.sb_shares_workspace(id));
drop policy if exists sb_profiles_update on public.sb_profiles;
create policy sb_profiles_update on public.sb_profiles for update using (id = auth.uid());

drop policy if exists sb_ws_read on public.sb_workspaces;
create policy sb_ws_read on public.sb_workspaces for select using (public.sb_is_member(id));
drop policy if exists sb_ws_update on public.sb_workspaces;
create policy sb_ws_update on public.sb_workspaces for update using (public.sb_role(id) in ('owner','admin'));

drop policy if exists sb_members_read on public.sb_workspace_members;
create policy sb_members_read on public.sb_workspace_members for select using (public.sb_is_member(workspace_id));
drop policy if exists sb_members_update on public.sb_workspace_members;
create policy sb_members_update on public.sb_workspace_members for update
  using (public.sb_role(workspace_id) in ('owner','admin') and role <> 'owner');
drop policy if exists sb_members_delete on public.sb_workspace_members;
create policy sb_members_delete on public.sb_workspace_members for delete
  using (public.sb_role(workspace_id) in ('owner','admin') and role <> 'owner');

drop policy if exists sb_invites_all on public.sb_invites;
create policy sb_invites_all on public.sb_invites for all
  using (public.sb_role(workspace_id) in ('owner','admin'))
  with check (public.sb_role(workspace_id) in ('owner','admin'));

drop policy if exists sb_notif_read on public.sb_notifications;
create policy sb_notif_read on public.sb_notifications for select using (user_id = auth.uid());
drop policy if exists sb_notif_update on public.sb_notifications;
create policy sb_notif_update on public.sb_notifications for update using (user_id = auth.uid());
drop policy if exists sb_notif_delete on public.sb_notifications;
create policy sb_notif_delete on public.sb_notifications for delete using (user_id = auth.uid());

drop policy if exists sb_subs_read on public.sb_subscriptions;
create policy sb_subs_read on public.sb_subscriptions for select using (user_id = auth.uid());
drop policy if exists sb_claims_read on public.sb_payment_claims;
create policy sb_claims_read on public.sb_payment_claims for select using (user_id = auth.uid());
drop policy if exists sb_claims_insert on public.sb_payment_claims;
create policy sb_claims_insert on public.sb_payment_claims for insert with check (user_id = auth.uid() and status = 'pending');

-- Workspace owned business tables: members read, owner/admin/member write, owner/admin delete.
do $$
declare t text;
begin
  foreach t in array array['sb_companies','sb_contacts','sb_leads','sb_opportunities','sb_tasks','sb_activities',
    'sb_enrichments','sb_lists','sb_list_items','sb_saved_searches','sb_signals','sb_signal_rules','sb_ai_reports',
    'sb_ai_messages','sb_workflows','sb_workflow_runs','sb_integrations','sb_audit_logs','sb_ai_usage','sb_ai_conversations']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select using (public.sb_is_member(workspace_id))', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('create policy %I on public.%I for insert with check (public.sb_role(workspace_id) in (''owner'',''admin'',''member''))', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('create policy %I on public.%I for update using (public.sb_role(workspace_id) in (''owner'',''admin'',''member''))', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for delete using (public.sb_role(workspace_id) in (''owner'',''admin''))', t || '_delete', t);
  end loop;
end $$;
-- Integrations are only changed through the server API (it verifies credentials first).
drop policy if exists sb_integrations_insert on public.sb_integrations;
drop policy if exists sb_integrations_update on public.sb_integrations;
drop policy if exists sb_integrations_delete on public.sb_integrations;

-- ============ Signup: profile, workspace, accepted invites ============
create or replace function public.sb_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare ws_id uuid; inv record; joined boolean := false;
begin
  insert into public.sb_profiles (id, email, full_name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;

  for inv in select * from public.sb_invites where lower(email) = lower(new.email) loop
    insert into public.sb_workspace_members (workspace_id, user_id, email, role)
    values (inv.workspace_id, new.id, lower(new.email), inv.role) on conflict do nothing;
    delete from public.sb_invites where id = inv.id;
    joined := true;
  end loop;

  insert into public.sb_workspaces (name, owner_id)
  values (coalesce(nullif(new.raw_user_meta_data->>'company_name', ''), 'My Workspace'), new.id)
  returning id into ws_id;
  insert into public.sb_workspace_members (workspace_id, user_id, email, role) values (ws_id, new.id, lower(new.email), 'owner');
  return new;
end $$;

drop trigger if exists sb_on_auth_user_created on auth.users;
create trigger sb_on_auth_user_created after insert on auth.users
  for each row execute function public.sb_handle_new_user();

-- Backfill for users who already exist in this project (old project): create profile and workspace on first use.
create or replace function public.sb_ensure_workspace() returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ws_id uuid; u record;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select workspace_id into ws_id from public.sb_workspace_members where user_id = uid limit 1;
  if ws_id is not null then return ws_id; end if;
  select * into u from auth.users where id = uid;
  insert into public.sb_profiles (id, email, full_name)
  values (uid, lower(u.email), coalesce(u.raw_user_meta_data->>'full_name', '')) on conflict (id) do nothing;
  insert into public.sb_workspaces (name, owner_id)
  values (coalesce(nullif(u.raw_user_meta_data->>'company_name', ''), 'My Workspace'), uid) returning id into ws_id;
  insert into public.sb_workspace_members (workspace_id, user_id, email, role) values (ws_id, uid, lower(u.email), 'owner');
  return ws_id;
end $$;
grant execute on function public.sb_ensure_workspace() to authenticated;
