"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { Badge, Card, Confirm, EmptyState, Modal, PageHeader, Skeleton, fdt, useToast } from "@/components/app/ui";
import { SIGNAL_TYPES } from "@/components/app/RecordDrawer";
import { INTENT } from "@/lib/entities";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function SignalsPage() {
  const { sb, workspaceId, canWrite, canManage, ingestKey } = useApp();
  const toast = useToast();
  const [signals, setSignals] = useState<Row[] | null>(null);
  const [rules, setRules] = useState<Row[]>([]);
  const [leads, setLeads] = useState<Row[]>([]);
  const [type, setType] = useState(""); const [src, setSrc] = useState("");
  const [add, setAdd] = useState(false); const [ruleModal, setRuleModal] = useState(false); const [delRule, setDelRule] = useState<Row | null>(null);
  const [f, setF] = useState({ type: "custom", title: "", strength: "50", lead_id: "" });
  const [r, setR] = useState({ name: "", signal_type: "website_visit", min_strength: "50", set_intent: "high", boost: "10" });

  const load = useCallback(async () => {
    let q = sb.from("sb_signals").select("*").eq("workspace_id", workspaceId).order("occurred_at", { ascending: false }).limit(200);
    if (type) q = q.eq("type", type); if (src) q = q.eq("source", src);
    const [s, ru, l] = await Promise.all([q, sb.from("sb_signal_rules").select("*").eq("workspace_id", workspaceId).order("created_at"), sb.from("sb_leads").select("id,name").eq("workspace_id", workspaceId).order("name").limit(500)]);
    setSignals(s.data ?? []); setRules(ru.data ?? []); setLeads(l.data ?? []);
  }, [sb, workspaceId, type, src]);
  useEffect(() => { load(); }, [load]);
  const leadName = (id: string) => leads.find((l) => l.id === id)?.name;

  async function addSignal(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await sb.from("sb_signals").insert({ workspace_id: workspaceId, type: f.type, title: f.title.trim(), strength: Math.max(0, Math.min(100, Number(f.strength) || 0)), lead_id: f.lead_id || null, source: "manual" });
    if (error) return toast("error", error.message);
    toast("success", "Signal recorded"); setAdd(false); setF({ ...f, title: "" }); load();
  }
  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await sb.from("sb_signal_rules").insert({ workspace_id: workspaceId, name: r.name.trim(), signal_type: r.signal_type, min_strength: Number(r.min_strength) || 0, set_intent: r.set_intent, boost: Number(r.boost) || 0 });
    if (error) return toast("error", error.message);
    toast("success", "Rule created"); setRuleModal(false); load();
  }
  async function toggleRule(x: Row) { await sb.from("sb_signal_rules").update({ enabled: !x.enabled }).eq("id", x.id); load(); }
  async function removeRule() { if (!delRule) return; const { error } = await sb.from("sb_signal_rules").delete().eq("id", delRule.id); if (error) toast("error", error.message); setDelRule(null); load(); }
  const sources = Array.from(new Set((signals ?? []).map((s) => s.source)));

  return (
    <div>
      <PageHeader title="Buying Signals" text="Signals received from connected sources or entered by your team. Nothing is generated." actions={<>{canWrite && <button className="btn-ghost" onClick={() => setRuleModal(true)}>New signal rule</button>}{canWrite && <button className="btn-sm" onClick={() => setAdd(true)}>Record signal</button>}</>} />
      {canManage && ingestKey && <Card className="mb-6 text-sm"><p className="font-semibold text-navy">Send signals automatically</p><p className="mt-1 text-muted">POST JSON to <code className="rounded bg-canvas px-1">/api/signals/ingest</code> with header <code className="rounded bg-canvas px-1">x-salesbuzz-key</code>. Full instructions are in Integrations.</p></Card>}
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="input w-52" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type"><option value="">All types</option>{SIGNAL_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        <select className="input w-44" value={src} onChange={(e) => setSrc(e.target.value)} aria-label="Filter by source"><option value="">All sources</option>{sources.map((t) => <option key={t}>{t}</option>)}</select>
      </div>
      {!signals ? <Skeleton /> : signals.length === 0 ? <EmptyState title="No signals yet" text="Send events from your product or website through the webhook, or record one manually to see the timeline." action={canWrite && <button className="btn-sm" onClick={() => setAdd(true)}>Record signal</button>} /> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[640px]"><thead className="border-b border-slate-100"><tr><th className="th">Signal</th><th className="th">Type</th><th className="th">Prospect</th><th className="th">Strength</th><th className="th">Source</th><th className="th">Date</th></tr></thead>
          <tbody>{signals.map((s) => <tr key={s.id} className="border-b border-slate-50 last:border-0"><td className="td font-medium text-navy">{s.title}</td><td className="td">{s.type}</td><td className="td">{s.lead_id ? leadName(s.lead_id) ?? "" : s.payload?.email ?? s.payload?.company ?? ""}</td><td className="td"><Badge tone={s.strength >= 70 ? "green" : s.strength >= 40 ? "amber" : "slate"}>{s.strength}</Badge></td><td className="td">{s.source}</td><td className="td">{fdt(s.occurred_at)}</td></tr>)}</tbody></table></div>
      )}
      <h2 className="mb-3 mt-10 text-lg font-bold text-navy">Custom signal rules</h2>
      <p className="mb-3 text-sm text-muted">When a matching signal arrives for a lead through the webhook, the rule sets the lead&apos;s buying intent.</p>
      {rules.length === 0 ? <p className="text-sm text-muted">No rules yet.</p> : <div className="space-y-2">{rules.map((x) => <Card key={x.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="text-sm"><p className="font-semibold text-navy">{x.name}</p><p className="text-muted">When {x.signal_type} with strength at least {x.min_strength}, set intent to {x.set_intent}</p></div>{canWrite && <div className="flex gap-3 text-sm"><button className="text-teal" onClick={() => toggleRule(x)}>{x.enabled ? "Disable" : "Enable"}</button><button className="text-red-600" onClick={() => setDelRule(x)}>Delete</button></div>}</Card>)}</div>}

      {add && <Modal title="Record signal" onClose={() => setAdd(false)}><form onSubmit={addSignal} className="space-y-3">
        <div><label className="label">Type</label><select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{SIGNAL_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div><label className="label">What happened</label><input className="input" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><label className="label">Prospect (optional)</label><select className="input" value={f.lead_id} onChange={(e) => setF({ ...f, lead_id: e.target.value })}><option value="">None</option>{leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
        <div><label className="label">Strength (0 to 100)</label><input className="input" type="number" min={0} max={100} value={f.strength} onChange={(e) => setF({ ...f, strength: e.target.value })} /></div>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setAdd(false)}>Cancel</button><button className="btn-sm">Save</button></div></form></Modal>}
      {ruleModal && <Modal title="New signal rule" onClose={() => setRuleModal(false)}><form onSubmit={addRule} className="space-y-3">
        <div><label className="label">Rule name</label><input className="input" required value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} /></div>
        <div><label className="label">Signal type</label><select className="input" value={r.signal_type} onChange={(e) => setR({ ...r, signal_type: e.target.value })}>{SIGNAL_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div><label className="label">Minimum strength</label><input className="input" type="number" min={0} max={100} value={r.min_strength} onChange={(e) => setR({ ...r, min_strength: e.target.value })} /></div>
        <div><label className="label">Set buying intent to</label><select className="input" value={r.set_intent} onChange={(e) => setR({ ...r, set_intent: e.target.value })}>{INTENT.filter((i) => i !== "unknown").map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setRuleModal(false)}>Cancel</button><button className="btn-sm">Create rule</button></div></form></Modal>}
      {delRule && <Confirm title="Delete rule" text={`Delete "${delRule.name}"?`} onConfirm={removeRule} onCancel={() => setDelRule(null)} />}
    </div>
  );
}
