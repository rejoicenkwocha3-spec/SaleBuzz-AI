"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "./AppProvider";
import { Badge, Modal, fdate, fdt, useToast } from "./ui";
import type { Entity } from "@/lib/entities";
import type { Reason } from "@/lib/scoring";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const TABS = ["Activity", "Tasks", "Signals", "Enrichment", "Score"] as const;

export function RecordDrawer({ ent, row, companyName, onClose, onChanged }: { ent: Entity; row: Row; companyName: Record<string, string>; onClose: () => void; onChanged: () => void }) {
  const type = ent.entityType!;
  const tabs = TABS.filter((t) => (t === "Signals" ? type === "lead" || type === "company" : t === "Enrichment" ? type !== "opportunity" : t === "Score" ? type === "lead" : true));
  const [tab, setTab] = useState<(typeof TABS)[number]>("Activity");
  const title = row.name ?? `${row.first_name} ${row.last_name ?? ""}`;
  return (
    <Modal title={title} onClose={onClose} wide>
      <p className="mb-4 text-sm text-muted">{[row.job_title, row.company_name ?? (row.company_id ? companyName[row.company_id] : null), row.email ?? row.website].filter(Boolean).join(" · ")}</p>
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        {tabs.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`whitespace-nowrap px-3 py-2 text-sm font-medium ${tab === t ? "border-b-2 border-teal text-teal" : "text-muted"}`}>{t}</button>)}
      </div>
      {tab === "Activity" && <Notes type={type} id={row.id} />}
      {tab === "Tasks" && <Tasks type={type} id={row.id} />}
      {tab === "Signals" && <Signals type={type} id={row.id} />}
      {tab === "Enrichment" && <Enrichment type={type} row={row} onChanged={onChanged} />}
      {tab === "Score" && <ScoreView row={row} />}
    </Modal>
  );
}

function useList<T>(table: string, filter: Record<string, string>, order: string) {
  const { sb, workspaceId } = useApp();
  const [data, setData] = useState<T[] | null>(null);
  const load = useCallback(async () => {
    let q = sb.from(table).select("*").eq("workspace_id", workspaceId);
    for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
    const { data } = await q.order(order, { ascending: false }).limit(100);
    setData((data as T[]) ?? []);
  }, [sb, workspaceId, table, order, JSON.stringify(filter)]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  return [data, load] as const;
}

function Notes({ type, id }: { type: string; id: string }) {
  const { sb, workspaceId, userId, canWrite, members } = useApp();
  const toast = useToast();
  const [items, load] = useList<Row>("sb_activities", { entity_type: type, entity_id: id }, "created_at");
  const [body, setBody] = useState(""); const [kind, setKind] = useState("note");
  async function add(e: React.FormEvent) {
    e.preventDefault(); if (!body.trim()) return;
    const { error } = await sb.from("sb_activities").insert({ workspace_id: workspaceId, entity_type: type, entity_id: id, kind, body: body.trim(), created_by: userId });
    if (error) return toast("error", error.message);
    setBody(""); load();
  }
  return (
    <div>
      {canWrite && <form onSubmit={add} className="mb-4 flex flex-col gap-2 sm:flex-row"><select className="input sm:w-32" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type">{["note", "call", "email", "meeting"].map((k) => <option key={k}>{k}</option>)}</select><input className="input" placeholder="Log a note or activity" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Activity text" /><button className="btn-sm">Add</button></form>}
      {!items ? <p className="text-sm text-muted">Loading...</p> : items.length === 0 ? <p className="text-sm text-muted">No activity logged yet.</p> :
        <ul className="space-y-3">{items.map((a) => <li key={a.id} className="rounded-xl border border-slate-100 p-3 text-sm"><div className="mb-1 flex items-center gap-2"><Badge tone="teal">{a.kind}</Badge><span className="text-xs text-muted">{members.find((m) => m.id === a.created_by)?.name ?? "Unknown"} · {fdt(a.created_at)}</span></div><p className="whitespace-pre-wrap">{a.body}</p></li>)}</ul>}
    </div>
  );
}

function Tasks({ type, id }: { type: string; id: string }) {
  const { sb, workspaceId, userId, canWrite, members } = useApp();
  const toast = useToast();
  const [items, load] = useList<Row>("sb_tasks", { entity_type: type, entity_id: id }, "created_at");
  const [title, setTitle] = useState(""); const [due, setDue] = useState(""); const [kind, setKind] = useState("task");
  async function add(e: React.FormEvent) {
    e.preventDefault(); if (!title.trim()) return;
    const { error } = await sb.from("sb_tasks").insert({ workspace_id: workspaceId, title: title.trim(), kind, due_at: due ? new Date(due).toISOString() : null, entity_type: type, entity_id: id, assignee_id: userId, created_by: userId });
    if (error) return toast("error", error.message);
    setTitle(""); setDue(""); load();
  }
  async function toggle(t: Row) { await sb.from("sb_tasks").update({ status: t.status === "done" ? "open" : "done" }).eq("id", t.id); load(); }
  async function del(t: Row) { const { error } = await sb.from("sb_tasks").delete().eq("id", t.id); if (error) toast("error", "Only owners and admins can delete tasks"); load(); }
  return (
    <div>
      {canWrite && <form onSubmit={add} className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]"><input className="input" placeholder="Task or reminder" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Task title" /><select className="input" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind"><option>task</option><option>reminder</option></select><input type="datetime-local" className="input" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due" /><button className="btn-sm">Add</button></form>}
      {!items ? <p className="text-sm text-muted">Loading...</p> : items.length === 0 ? <p className="text-sm text-muted">No tasks yet.</p> :
        <ul className="space-y-2">{items.map((t) => <li key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-sm"><input type="checkbox" aria-label="Done" checked={t.status === "done"} disabled={!canWrite} onChange={() => toggle(t)} /><div className="flex-1"><p className={t.status === "done" ? "text-muted line-through" : ""}>{t.title}</p><p className="text-xs text-muted">{t.kind}{t.due_at ? ` · due ${fdt(t.due_at)}` : ""}{t.assignee_id ? ` · ${members.find((m) => m.id === t.assignee_id)?.name ?? ""}` : ""}</p></div>{canWrite && <button className="text-red-600" onClick={() => del(t)}>Delete</button>}</li>)}</ul>}
    </div>
  );
}

function Signals({ type, id }: { type: string; id: string }) {
  const { sb, workspaceId, canWrite } = useApp();
  const toast = useToast();
  const [items, load] = useList<Row>("sb_signals", { [type === "lead" ? "lead_id" : "company_id"]: id }, "occurred_at");
  const [f, setF] = useState({ type: "website_visit", title: "", strength: "50" });
  async function add(e: React.FormEvent) {
    e.preventDefault(); if (!f.title.trim()) return;
    const { error } = await sb.from("sb_signals").insert({ workspace_id: workspaceId, [type === "lead" ? "lead_id" : "company_id"]: id, type: f.type, title: f.title.trim(), strength: Math.max(0, Math.min(100, Number(f.strength) || 0)), source: "manual" });
    if (error) return toast("error", error.message);
    setF({ ...f, title: "" }); load(); toast("success", "Signal recorded");
  }
  return (
    <div>
      <p className="mb-3 text-xs text-muted">Only signals from connected sources or entered by your team appear here. Nothing is generated.</p>
      {canWrite && <form onSubmit={add} className="mb-4 grid gap-2 sm:grid-cols-[auto_1fr_90px_auto]"><select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} aria-label="Signal type">{SIGNAL_TYPES.map((s) => <option key={s}>{s}</option>)}</select><input className="input" placeholder="What happened?" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} aria-label="Signal title" /><input className="input" type="number" min={0} max={100} value={f.strength} onChange={(e) => setF({ ...f, strength: e.target.value })} aria-label="Strength" /><button className="btn-sm">Add signal</button></form>}
      {!items ? <p className="text-sm text-muted">Loading...</p> : items.length === 0 ? <p className="text-sm text-muted">No signals yet.</p> :
        <ol className="space-y-3 border-l-2 border-teal/30 pl-4">{items.map((s) => <li key={s.id} className="text-sm"><p className="font-medium text-navy">{s.title}</p><p className="text-xs text-muted">{s.type} · strength {s.strength} · source {s.source} · {fdt(s.occurred_at)}</p></li>)}</ol>}
    </div>
  );
}
export const SIGNAL_TYPES = ["website_visit", "product_signup", "product_usage", "job_change", "company_expansion", "hiring", "social_engagement", "event_registration", "webinar_attendance", "public_discussion", "crm_activity", "custom"];

function Enrichment({ type, row, onChanged }: { type: string; row: Row; onChanged: () => void }) {
  const { sb, workspaceId, userId, canWrite } = useApp();
  const toast = useToast();
  const [items, load] = useList<Row>("sb_enrichments", { entity_id: row.id }, "updated_at");
  const [f, setF] = useState({ field: "", value: "", source: "Manual entry" });
  const [busy, setBusy] = useState(false);
  async function add(e: React.FormEvent) {
    e.preventDefault(); if (!f.field.trim() || !f.value.trim()) return;
    const { error } = await sb.from("sb_enrichments").insert({ workspace_id: workspaceId, entity_type: type, entity_id: row.id, field: f.field.trim(), value: f.value.trim(), source: f.source.trim() || "Manual entry", reviewed: true, updated_by: userId });
    if (error) return toast("error", error.message);
    setF({ field: "", value: "", source: "Manual entry" }); load();
  }
  async function correct(it: Row) {
    const v = window.prompt(`Correct "${it.field}"`, it.value);
    if (v == null || !v.trim()) return;
    const { error } = await sb.from("sb_enrichments").update({ value: v.trim(), reviewed: true, updated_by: userId, updated_at: new Date().toISOString() }).eq("id", it.id);
    if (error) return toast("error", error.message); load();
  }
  async function review(it: Row) { await sb.from("sb_enrichments").update({ reviewed: true, updated_by: userId, updated_at: new Date().toISOString() }).eq("id", it.id); load(); }
  async function del(it: Row) { const { error } = await sb.from("sb_enrichments").delete().eq("id", it.id); if (error) toast("error", "Only owners and admins can delete"); load(); }
  async function fetchSite() {
    setBusy(true);
    const r = await fetch("/api/enrich", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId, companyId: row.id }) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return toast("error", j.error); toast("success", `Added ${j.added} fields from the website`); load(); onChanged();
  }
  return (
    <div>
      {type === "company" && canWrite && <div className="mb-4 flex flex-wrap items-center gap-3"><button className="btn-ghost" onClick={fetchSite} disabled={busy}>{busy ? "Fetching..." : "Enrich from company website"}</button><span className="text-xs text-muted">Reads the public title and description of the website saved on this company.</span></div>}
      {canWrite && <form onSubmit={add} className="mb-4 grid gap-2 sm:grid-cols-[1fr_1.5fr_1fr_auto]"><input className="input" placeholder="Field" value={f.field} onChange={(e) => setF({ ...f, field: e.target.value })} aria-label="Field" /><input className="input" placeholder="Value" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} aria-label="Value" /><input className="input" placeholder="Source" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} aria-label="Source" /><button className="btn-sm">Add</button></form>}
      {!items ? <p className="text-sm text-muted">Loading...</p> : items.length === 0 ? <p className="text-sm text-muted">No enrichment records. Add details with their source, or fetch them from a company website.</p> :
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="th">Field</th><th className="th">Value</th><th className="th">Source</th><th className="th">Updated</th><th className="th">Status</th><th /></tr></thead><tbody>{items.map((it) => <tr key={it.id} className="border-t border-slate-100"><td className="td font-medium">{it.field}</td><td className="td">{it.value}</td><td className="td">{it.source}</td><td className="td">{fdate(it.updated_at)}</td><td className="td"><Badge tone={it.reviewed ? "green" : "amber"}>{it.reviewed ? "Reviewed" : "Needs review"}</Badge></td><td className="td whitespace-nowrap text-right">{canWrite && <><button className="mr-2 text-teal" onClick={() => correct(it)}>Correct</button>{!it.reviewed && <button className="mr-2 text-teal" onClick={() => review(it)}>Approve</button>}<button className="text-red-600" onClick={() => del(it)}>Delete</button></>}</td></tr>)}</tbody></table></div>}
    </div>
  );
}

function ScoreView({ row }: { row: Row }) {
  const reasons = (row.score_reason ?? []) as Reason[];
  return (
    <div>
      <p className="mb-4 text-sm">Score <strong className="text-2xl text-navy">{row.score}</strong> out of 100</p>
      {reasons.length === 0 ? <p className="text-sm text-muted">No explanation stored yet. Save the lead or use Rescore all.</p> :
        <ul className="space-y-2">{reasons.map((r) => <li key={r.criterion} className="rounded-xl border border-slate-100 p-3 text-sm"><div className="flex justify-between"><span className="font-medium">{r.label}</span><span>{r.points} of {r.max}</span></div><p className="text-xs text-muted">{r.why}</p></li>)}</ul>}
      <p className="mt-4 text-xs text-muted">Administrators can change the weights and targets in Settings.</p>
    </div>
  );
}
