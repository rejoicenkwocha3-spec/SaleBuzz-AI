import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { runWorkflows } from "@/lib/workflows/engine";
import { rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  type: z.string().min(1).max(60), title: z.string().min(1).max(200),
  strength: z.number().int().min(0).max(100).default(50), source: z.string().max(60).optional(),
  occurred_at: z.string().datetime().optional(), email: z.string().email().optional(),
  company: z.string().max(200).optional(), payload: z.record(z.string(), z.unknown()).optional(),
});

// Receives real signals from Segment, Zapier, your product, or any system that can send a webhook.
// Auth: header x-salesbuzz-key: <workspace ingest key shown in Integrations>.
export async function POST(req: Request) {
  if (!hasServiceRole()) return NextResponse.json({ error: "Server is not configured" }, { status: 503 });
  const key = req.headers.get("x-salesbuzz-key") || "";
  if (key.length < 20) return NextResponse.json({ error: "Missing key" }, { status: 401 });
  if (!rateLimit(`ingest:${key.slice(0, 12)}`, 120, 60_000)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const admin = createAdminClient();
  const { data: ws } = await admin.from("sb_workspaces").select("id").eq("ingest_key", key).maybeSingle();
  if (!ws) return NextResponse.json({ error: "Invalid key" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  const s = parsed.data;

  let lead: Record<string, unknown> | null = null, companyId: string | null = null;
  if (s.email) {
    const { data } = await admin.from("sb_leads").select("*").eq("workspace_id", ws.id).ilike("email", s.email).limit(1).maybeSingle();
    lead = data;
  }
  if (s.company) {
    const { data } = await admin.from("sb_companies").select("id").eq("workspace_id", ws.id).ilike("name", s.company).limit(1).maybeSingle();
    companyId = data?.id ?? null;
  }
  const { data: sig, error } = await admin.from("sb_signals").insert({
    workspace_id: ws.id, lead_id: (lead?.id as string) ?? null, company_id: companyId ?? (lead?.company_id as string) ?? null,
    type: s.type, title: s.title, strength: s.strength, source: s.source ?? "webhook",
    occurred_at: s.occurred_at ?? new Date().toISOString(), payload: { ...(s.payload ?? {}), email: s.email, company: s.company },
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Custom signal rules: raise intent when a matching signal arrives.
  if (lead) {
    const { data: rules } = await admin.from("sb_signal_rules").select("*").eq("workspace_id", ws.id).eq("enabled", true);
    for (const r of rules ?? []) {
      if (r.signal_type === s.type && s.strength >= r.min_strength && r.set_intent) {
        await admin.from("sb_leads").update({ intent: r.set_intent }).eq("id", lead.id as string);
        lead = { ...lead, intent: r.set_intent };
      }
    }
  }
  await admin.from("sb_integrations").upsert({ workspace_id: ws.id, provider: "inbound_webhook", status: "connected", last_synced_at: new Date().toISOString(), last_error: null }, { onConflict: "workspace_id,provider" });
  await runWorkflows(admin, ws.id, "signal_received", { ...(lead ?? {}), name: lead?.name ?? s.title, signal_type: s.type, signal_strength: s.strength, signal_title: s.title, id: lead?.id });
  return NextResponse.json({ ok: true, id: sig.id, matched_lead: !!lead });
}
