import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/api";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { runWorkflows, TRIGGERS } from "@/lib/workflows/engine";

const TABLES: Record<string, string> = { lead: "sb_leads", opportunity: "sb_opportunities" };

// Called by the app after a lead is created, a status changes, or a score is calculated.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const c = await getApiContext(b.workspaceId);
  if ("error" in c) return c.error;
  const table = TABLES[b.entity as string];
  if (!table || !(TRIGGERS as readonly string[]).includes(b.trigger)) return NextResponse.json({ error: "Invalid trigger" }, { status: 400 });
  if (!hasServiceRole()) return NextResponse.json({ ok: false, skipped: "SUPABASE_SERVICE_ROLE_KEY not configured" });
  // Load through the user's RLS bound client so a user can only trigger on records they can see.
  const { data: rec } = await c.supabase.from(table).select("*").eq("id", b.id).eq("workspace_id", b.workspaceId).maybeSingle();
  if (!rec) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  await runWorkflows(createAdminClient(), b.workspaceId, b.trigger, rec, table);
  return NextResponse.json({ ok: true });
}
