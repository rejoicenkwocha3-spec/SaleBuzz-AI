import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/api";

const TABLES = ["sb_companies", "sb_contacts", "sb_leads", "sb_opportunities", "sb_tasks", "sb_activities", "sb_signals", "sb_enrichments", "sb_workflows", "sb_ai_reports"];

// Full workspace export (owners and admins only). Logged in the audit log.
export async function GET(req: Request) {
  const ws = new URL(req.url).searchParams.get("workspaceId") ?? undefined;
  const c = await getApiContext(ws);
  if ("error" in c) return c.error;
  if (!c.canManage) return NextResponse.json({ error: "Only owners and admins can export data" }, { status: 403 });
  const out: Record<string, unknown> = { exported_at: new Date().toISOString() };
  for (const t of TABLES) out[t] = (await c.supabase.from(t).select("*").eq("workspace_id", ws!)).data ?? [];
  await c.supabase.from("sb_audit_logs").insert({ workspace_id: ws, user_id: c.user.id, action: "workspace.export" });
  return new NextResponse(JSON.stringify(out, null, 2), { headers: { "content-type": "application/json", "content-disposition": 'attachment; filename="salesbuzz-export.json"' } });
}
