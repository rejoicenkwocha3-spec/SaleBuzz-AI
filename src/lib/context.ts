import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "owner" | "admin" | "member" | "viewer";
export const adminEmails = () => (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

export async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.rpc("sb_ensure_workspace");
  const { data: mems } = await supabase
    .from("sb_workspace_members").select("workspace_id, role, sb_workspaces(id, name)").eq("user_id", user.id);
  const memberships = (mems ?? []).map((m) => ({
    id: m.workspace_id as string, role: m.role as Role,
    name: ((m.sb_workspaces as unknown) as { name: string } | null)?.name ?? "Workspace",
  }));
  if (!memberships.length) redirect("/login?error=workspace");

  const chosen = (await cookies()).get("sb_ws")?.value;
  const current = memberships.find((m) => m.id === chosen) ?? memberships[0];

  const [{ data: workspace }, { data: memberRows }, { data: subs }] = await Promise.all([
    supabase.from("sb_workspaces").select("id, name, ingest_key, preferences, scoring").eq("id", current.id).single(),
    supabase.from("sb_workspace_members").select("user_id, role, email").eq("workspace_id", current.id),
    supabase.from("sb_subscriptions").select("*").eq("user_id", user.id).eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);
  const ids = (memberRows ?? []).map((m) => m.user_id);
  const { data: profs } = await supabase.from("sb_profiles").select("id, full_name").in("id", ids);
  const members = (memberRows ?? []).map((m) => ({
    id: m.user_id as string, role: m.role as Role, email: m.email as string | null,
    name: profs?.find((p) => p.id === m.user_id)?.full_name || m.email || "Member",
  }));
  const now = Date.now();
  const subscription = (subs ?? []).find((s) => !s.current_period_end || new Date(s.current_period_end).getTime() > now) ?? null;
  const isAdmin = adminEmails().includes((user.email || "").toLowerCase());

  return {
    supabase, user, workspace: workspace!, role: current.role, memberships, members,
    subscription, isAdmin, hasAccess: !!subscription || isAdmin,
    canWrite: current.role !== "viewer", canManage: current.role === "owner" || current.role === "admin",
  };
}
export type Ctx = Awaited<ReturnType<typeof getContext>>;
