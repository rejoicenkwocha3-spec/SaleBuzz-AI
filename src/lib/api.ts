import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminEmails } from "@/lib/context";

/** Authenticates an API request and verifies workspace membership through RLS. */
export async function getApiContext(workspaceId: string | undefined) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  if (!workspaceId) return { error: NextResponse.json({ error: "workspaceId is required" }, { status: 400 }) };
  const { data: m } = await supabase.from("sb_workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  if (!m) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  const { data: subs } = await supabase.from("sb_subscriptions").select("current_period_end").eq("user_id", user.id).eq("status", "active");
  const now = Date.now();
  const active = (subs ?? []).some((s) => !s.current_period_end || new Date(s.current_period_end).getTime() > now);
  const isAdmin = adminEmails().includes((user.email || "").toLowerCase());
  const role = m.role as string;
  return { supabase, user, role, hasAccess: active || isAdmin, isAdmin, canWrite: role !== "viewer", canManage: role === "owner" || role === "admin" };
}
