"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { Badge, Card, Confirm, Modal, PageHeader, Skeleton, fdt, useToast } from "@/components/app/ui";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Def = { id: string; name: string; kind: "secret" | "inbound" | "csv" | "oauth"; text: string; label?: string; placeholder?: string; help: string };
const DEFS: Def[] = [
  { id: "inbound_webhook", name: "Webhooks, Segment and Zapier", kind: "inbound", text: "Receive buying signals from your product, Segment, Zapier, or any system that can send an HTTP request.", help: "Active as soon as your workspace key receives its first event." },
  { id: "hubspot", name: "HubSpot", kind: "secret", label: "Private app access token", placeholder: "pat-...", text: "Import HubSpot contacts as leads.", help: "In HubSpot create a private app with the crm.objects.contacts.read scope and paste its token. We verify it before connecting." },
  { id: "slack", name: "Slack", kind: "secret", label: "Incoming webhook URL", placeholder: "https://hooks.slack.com/services/...", text: "Post workflow alerts to a Slack channel.", help: "Create an incoming webhook in your Slack app. We send a test message before connecting." },
  { id: "webhook_out", name: "Outbound webhook", kind: "secret", label: "Endpoint URL (https)", placeholder: "https://example.com/hook", text: "Send workflow events to any approved endpoint.", help: "We send a test request before connecting. Private network addresses are blocked." },
  { id: "csv", name: "CSV imports", kind: "csv", text: "Import leads, contacts, companies, and opportunities from spreadsheets.", help: "Use the Import CSV button on any records page." },
  { id: "salesforce", name: "Salesforce", kind: "oauth", text: "Sync leads and opportunities with Salesforce.", help: "Requires a Salesforce connected app (client ID and secret) configured by your administrator. Not yet set up." },
  { id: "google_sheets", name: "Google Sheets", kind: "oauth", text: "Sync records with Google Sheets.", help: "Requires a Google Cloud OAuth client. Not yet set up. Meanwhile, export a sheet as CSV and import it." },
  { id: "google_analytics", name: "Google Analytics", kind: "oauth", text: "Bring website behavior into signals.", help: "Requires a Google Cloud OAuth client. Not yet set up. Meanwhile, forward events with Segment or webhooks." },
  { id: "email", name: "Email platforms", kind: "oauth", text: "Connect your email platform for engagement signals.", help: "Not yet set up. Most platforms can forward events to your webhook endpoint." },
];

export default function IntegrationsPage() {
  const { sb, workspaceId, canManage, ingestKey } = useApp();
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [connect, setConnect] = useState<Def | null>(null); const [secret, setSecret] = useState(""); const [busy, setBusy] = useState("");
  const [disc, setDisc] = useState<Def | null>(null); const [docs, setDocs] = useState(false);
  const load = useCallback(async () => { const { data } = await sb.from("sb_integrations").select("*").eq("workspace_id", workspaceId); setRows(data ?? []); }, [sb, workspaceId]);
  useEffect(() => { load(); }, [load]);
  const get = (id: string) => rows?.find((r) => r.provider === id);

  async function call(action: string, provider: string, extra: Row = {}) {
    setBusy(provider + action);
    const r = await fetch("/api/integrations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId, action, provider, ...extra }) });
    const j = await r.json().catch(() => ({ error: "Request failed" })); setBusy("");
    if (!r.ok) { toast("error", j.error); load(); return false; }
    return j;
  }
  async function doConnect(e: React.FormEvent) { e.preventDefault(); if (!connect) return; const j = await call("connect", connect.id, { secret }); if (j) { toast("success", `${connect.name} connected`); setConnect(null); setSecret(""); load(); } }
  async function doSync(id: string) { const j = await call("sync", id); if (j) { toast("success", `Imported ${j.imported} new leads`); load(); } }
  async function doDisc() { if (!disc) return; const j = await call("disconnect", disc.id); if (j) { toast("success", "Disconnected"); load(); } setDisc(null); }
  const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/signals/ingest` : "/api/signals/ingest";

  return (
    <div>
      <PageHeader title="Integrations" text="An integration shows as connected only after its credentials are verified." />
      {!rows ? <Skeleton /> : <div className="grid gap-4 md:grid-cols-2">{DEFS.map((d) => {
        const r = get(d.id);
        const live = d.kind === "csv" ? "available" : d.kind === "oauth" ? "setup" : r?.status === "connected" ? "connected" : r?.status === "error" ? "error" : "off";
        return (
          <Card key={d.id}>
            <div className="flex items-start justify-between gap-3"><h2 className="font-bold text-navy">{d.name}</h2>
              <Badge tone={live === "connected" ? "green" : live === "error" ? "red" : live === "available" ? "teal" : "slate"}>{live === "connected" ? "Connected" : live === "error" ? "Error" : live === "available" ? "Available" : live === "setup" ? "Needs setup" : "Not connected"}</Badge></div>
            <p className="mt-1 text-sm text-muted">{d.text}</p>
            <p className="mt-2 text-xs text-muted">{d.help}</p>
            {r?.last_synced_at && <p className="mt-2 text-xs text-muted">Last activity: {fdt(r.last_synced_at)}</p>}
            {r?.last_error && <p className="mt-2 text-xs text-red-600">Last error: {r.last_error}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {d.kind === "secret" && canManage && (r?.status === "connected" ? <>
                {d.id === "hubspot" && <button className="btn-sm" disabled={!!busy} onClick={() => doSync(d.id)}>{busy === "hubspotsync" ? "Syncing..." : "Sync now"}</button>}
                <button className="btn-ghost" onClick={() => setDisc(d)}>Disconnect</button></> : <button className="btn-sm" onClick={() => { setConnect(d); setSecret(""); }}>Connect</button>)}
              {d.kind === "inbound" && canManage && <button className="btn-sm" onClick={() => setDocs(true)}>Setup instructions</button>}
              {d.kind === "secret" && !canManage && <span className="text-xs text-muted">Owners and admins can connect.</span>}
            </div>
          </Card>);
      })}</div>}
      {connect && <Modal title={`Connect ${connect.name}`} onClose={() => setConnect(null)}><form onSubmit={doConnect} className="space-y-3"><p className="text-sm text-muted">{connect.help}</p>
        <div><label className="label" htmlFor="sec">{connect.label}</label><input id="sec" className="input" type="password" autoComplete="off" placeholder={connect.placeholder} value={secret} onChange={(e) => setSecret(e.target.value)} required /></div>
        <p className="text-xs text-muted">Stored encrypted at rest by Supabase and readable only by the server. It is never sent back to the browser.</p>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setConnect(null)}>Cancel</button><button className="btn-sm" disabled={!!busy}>{busy ? "Verifying..." : "Verify and connect"}</button></div></form></Modal>}
      {disc && <Confirm title={`Disconnect ${disc.name}`} text="The stored credential is deleted. Workflows that use it will fail until you reconnect." confirmLabel="Disconnect" onConfirm={doDisc} onCancel={() => setDisc(null)} />}
      {docs && <Modal title="Send signals to SalesBuzz AI" onClose={() => setDocs(false)} wide><div className="space-y-3 text-sm">
        <p>Send a POST request with your workspace key. Segment webhook destinations and Zapier webhook actions can send the same payload.</p>
        <p className="font-semibold">Endpoint</p><code className="block break-all rounded bg-canvas p-2 text-xs">{endpoint}</code>
        <p className="font-semibold">Workspace key (keep secret)</p><code className="block break-all rounded bg-canvas p-2 text-xs">{ingestKey || "Only owners and admins can see the key"}</code>
        <p className="font-semibold">Example</p><pre className="overflow-x-auto rounded bg-navy-deep p-3 text-xs text-slate-100">{`curl -X POST ${endpoint} \\
  -H "content-type: application/json" \\
  -H "x-salesbuzz-key: YOUR_KEY" \\
  -d '{"type":"website_visit","title":"Viewed pricing page","strength":70,"email":"lead@example.com","source":"segment"}'`}</pre>
        <p className="text-muted">Fields: type, title, strength (0 to 100), source, email or company (to link the signal), occurred_at (ISO date), payload (any JSON).</p></div></Modal>}
    </div>
  );
}
