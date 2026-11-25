-- Table privileges for the SalesBuzz (sb_) tables only. Row Level Security still decides which rows are visible.
-- Newer Supabase projects do not grant new tables to the API roles automatically, which causes
-- "permission denied for table ..." errors. Safe to run more than once.
grant usage on schema public to authenticated, service_role;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'sb\_%' loop
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
    if t not in ('sb_integration_secrets', 'sb_payment_events', 'sb_contact_messages') then
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    end if;
  end loop;
end $$;

-- Least privilege: remove rights the browser should never have (the server handles these).
revoke insert, update, delete on public.sb_integrations from authenticated;
revoke insert, update, delete on public.sb_subscriptions from authenticated;
revoke update, delete on public.sb_payment_claims from authenticated;
revoke insert, delete on public.sb_workspaces from authenticated;
revoke insert on public.sb_workspace_members from authenticated;
revoke insert, delete on public.sb_profiles from authenticated;
revoke insert on public.sb_notifications from authenticated;

grant execute on function public.sb_role(uuid), public.sb_is_member(uuid), public.sb_shares_workspace(uuid) to authenticated;
grant execute on function public.sb_ensure_workspace() to authenticated;
