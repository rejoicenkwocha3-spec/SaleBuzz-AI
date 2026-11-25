import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/api";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { assertPublicUrl, safeFetch } from "@/lib/safeUrl";

// Credentials are verified against the provider BEFORE an integration is marked connected.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const c = await getApiContext(b.workspaceId);
  if ("error" in c) return c.error;
  if (!c.canManage) return NextResponse.json({ error: "Only owners and admins can manage integrations" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required to store integration credentials securely" }, { status: 503 });
  const admin = createAdminClient();
  const ws = b.workspaceId as string, provider = String(b.provider);
  const setStatus = (status: string, extra: Record<string, unknown> = {}) =>
    admin.from("sb_integrations").upsert({ workspace_id: ws, provider, status, ...extra }, { onConflict: "workspace_id,provider" });
  const audit = (action: string) => admin.from("sb_audit_logs").insert({ workspace_id: ws, user_id: c.user.id, action, entity: "integration", entity_id: provider });

  try {
    if (b.action === "disconnect") {
      await admin.from("sb_integration_secrets").delete().eq("workspace_id", ws).eq("provider", provider);
      await setStatus("disconnected", { last_error: null, config: {} });
      await audit("integration.disconnect");
      return NextResponse.json({ ok: true });
    }
    if (b.action === "connect") {
      const secret = String(b.secret || "").trim();
      if (!secret) return NextResponse.json({ error: "Enter the required credential" }, { status: 400 });
      if (provider === "slack" || provider === "webhook_out") {
        await assertPublicUrl(secret);
        if (provider === "slack" && !/^https:\/\/hooks\.slack\.com\//.test(secret)) throw new Error("Use a Slack incoming webhook URL (https://hooks.slack.com/...)");
        const r = await safeFetch(secret, { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify(provider === "slack" ? { text: "SalesBuzz AI connected to this channel." } : { event: "salesbuzz.test" }) });
        if (!r.ok) throw new Error(`The endpoint rejected the test message (${r.status})`);
      } else if (provider === "hubspot") {
        const r = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", { headers: { authorization: `Bearer ${secret}` } });
        if (!r.ok) throw new Error(r.status === 401 ? "HubSpot rejected this token" : `HubSpot returned ${r.status}`);
      } else return NextResponse.json({ error: "This provider needs OAuth app credentials that are not configured yet" }, { status: 501 });
      await admin.from("sb_integration_secrets").upsert({ workspace_id: ws, provider, secret }, { onConflict: "workspace_id,provider" });
      await setStatus("connected", { last_error: null, config: { connected_by: c.user.email } });
      await audit("integration.connect");
      return NextResponse.json({ ok: true });
    }
    if (b.action === "sync" && provider === "hubspot") {
      const { data: sec } = await admin.from("sb_integration_secrets").select("secret").eq("workspace_id", ws).eq("provider", provider).maybeSingle();
      if (!sec) throw new Error("HubSpot is not connected");
      let after = "", imported = 0;
      for (let page = 0; page < 5; page++) {
        const r = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,jobtitle,company${after ? `&after=${after}` : ""}`, { headers: { authorization: `Bearer ${sec.secret}` } });
        if (!r.ok) throw new Error(`HubSpot returned ${r.status}`);
        const j = await r.json();
        const rows = (j.results ?? []).filter((x: { properties: { email?: string } }) => x.properties.email);
        for (const x of rows) {
          const p = x.properties;
          const { data: ex } = await admin.from("sb_leads").select("id").eq("workspace_id", ws).ilike("email", p.email).maybeSingle();
          if (ex) continue;
          await admin.from("sb_leads").insert({ workspace_id: ws, name: [p.firstname, p.lastname].filter(Boolean).join(" ") || p.email, email: p.email, job_title: p.jobtitle, company_name: p.company, source: "HubSpot", owner_id: c.user.id });
          imported++;
        }
        after = j.paging?.next?.after;
        if (!after) break;
      }
      await setStatus("connected", { last_synced_at: new Date().toISOString(), last_error: null });
      return NextResponse.json({ ok: true, imported });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (b.action === "sync") await setStatus("error", { last_error: msg });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
