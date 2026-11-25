"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { Badge, Card, Confirm, EmptyState, Modal, PageHeader, Skeleton, fdt, useToast } from "@/components/app/ui";
import { LEAD_STATUS } from "@/lib/entities";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const TRIGGERS: Record<string, string> = { lead_created: "A lead is created", signal_received: "A signal is received", score_threshold: "A lead score is calculated", status_changed: "A status or stage changes" };
const FIELDS = ["score", "status", "intent", "industry", "company_size", "source", "job_title", "signal_type", "signal_strength"];
const OPS = [["eq", "equals"], ["neq", "does not equal"], ["gte", "at least"], ["lte", "at most"], ["contains", "contains"]];
const ACTIONS: Record<string, string> = { notify: "Send an internal notification", assign_owner: "Assign owner", create_task: "Create a follow up task", update_status: "Update status", slack: "Post to Slack", webhook: "Call outbound webhook" };
type Cond = { field: string; op: string; value: string }; type Act = { type: string; params: Record<string, string> };

export default function WorkflowsPage() {
  const { sb, workspaceId, canWrite, members } = useApp();
  const toast = useToast();
  const [flows, setFlows] = useState<Row[] | null>(null); const [runs, setRuns] = useState<Row[]>([]);
  const [edit, setEdit] = useState<Row | "new" | null>(null); const [del, setDel] = useState<Row | null>(null); const [hist, setHist] = useState<Row | null>(null);

  const load = useCallback(async () => {
    const [f, r] = await Promise.all([sb.from("sb_workflows").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }), sb.from("sb_workflow_runs").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(300)]);
    setFlows(f.data ?? []); setRuns(r.data ?? []);
  }, [sb, workspaceId]);
  useEffect(() => { load(); }, [load]);

  async function toggle(w: Row) { const { error } = await sb.from("sb_workflows").update({ status: w.status === "active" ? "paused" : "active" }).eq("id", w.id); if (error) toast("error", error.message); load(); }
  async function remove() { if (!del) return; const { error } = await sb.from("sb_workflows").delete().eq("id", del.id); if (error) toast("error", "Only owners and admins can delete workflows"); else toast("success", "Workflow deleted"); setDel(null); load(); }
  const stats = (id: string) => { const r = runs.filter((x) => x.workflow_id === id); return { total: r.length, failed: r.filter((x) => x.status === "failed").length }; };

  return (
    <div>
      <PageHeader title="Workflows" text="Automate repetitive sales work. Workflows run when records are created or changed in the app, and when signals arrive through your webhook." actions={canWrite && <button className="btn-sm" onClick={() => setEdit("new")}>New workflow</button>} />
      {!flows ? <Skeleton /> : flows.length === 0 ? <EmptyState title="No workflows yet" text="Create one to notify reps about high intent leads, assign new leads, or create follow up tasks automatically." action={canWrite && <button className="btn-sm" onClick={() => setEdit("new")}>New workflow</button>} /> : (
        <div className="space-y-3">{flows.map((w) => { const s = stats(w.id); return (
          <Card key={w.id} className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="flex items-center gap-2"><p className="font-semibold text-navy">{w.name}</p><Badge tone={w.status === "active" ? "green" : "slate"}>{w.status}</Badge></div>
              <p className="mt-1 text-sm text-muted">When: {TRIGGERS[w.trigger]}. {w.conditions.length} condition(s), {w.actions.length} action(s). {s.total} runs{s.failed ? `, ${s.failed} failed` : ""}.</p></div>
            <div className="flex gap-3 text-sm"><button className="text-teal" onClick={() => setHist(w)}>History</button>{canWrite && <><button className="text-teal" onClick={() => toggle(w)}>{w.status === "active" ? "Pause" : "Resume"}</button><button className="text-teal" onClick={() => setEdit(w)}>Edit</button><button className="text-red-600" onClick={() => setDel(w)}>Delete</button></>}</div>
          </Card>); })}</div>
      )}
      {edit && <Builder initial={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} members={members} />}
      {del && <Confirm title="Delete workflow" text={`Delete "${del.name}" and its execution history?`} onConfirm={remove} onCancel={() => setDel(null)} />}
      {hist && <Modal title={`${hist.name}: execution history`} onClose={() => setHist(null)} wide>
        {runs.filter((r) => r.workflow_id === hist.id).length === 0 ? <p className="text-sm text-muted">This workflow has not run yet.</p> :
          <ul className="space-y-2">{runs.filter((r) => r.workflow_id === hist.id).slice(0, 50).map((r) => <li key={r.id} className="rounded-xl border border-slate-100 p-3 text-sm"><div className="flex items-center gap-2"><Badge tone={r.status === "success" ? "green" : r.status === "failed" ? "red" : "slate"}>{r.status}</Badge><span className="text-xs text-muted">{fdt(r.created_at)}</span></div>{(r.log as string[]).length > 0 && <ul className="mt-1 list-disc pl-5 text-muted">{(r.log as string[]).map((l, i) => <li key={i}>{l}</li>)}</ul>}{r.error && <p className="mt-1 text-red-600">Error: {r.error}</p>}</li>)}</ul>}
      </Modal>}
    </div>
  );
}

function Builder({ initial, onClose, onSaved, members }: { initial: Row | null; onClose: () => void; onSaved: () => void; members: { id: string; name: string }[] }) {
  const { sb, workspaceId, userId } = useApp();
  const toast = useToast();
  const [name, setName] = useState(initial?.name ?? ""); const [trigger, setTrigger] = useState(initial?.trigger ?? "lead_created");
  const [conds, setConds] = useState<Cond[]>(initial?.conditions ?? []); const [acts, setActs] = useState<Act[]>(initial?.actions ?? [{ type: "notify", params: { user_id: "all", title: "New lead", body: "{{name}}" } }]);
  const [busy, setBusy] = useState(false);
  const setAct = (i: number, a: Act) => setActs(acts.map((x, j) => (j === i ? a : x)));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !acts.length) return toast("error", "Add a name and at least one action");
    setBusy(true);
    const body = { name: name.trim(), trigger, conditions: conds.filter((c) => c.value !== ""), actions: acts };
    const { error } = initial ? await sb.from("sb_workflows").update(body).eq("id", initial.id) : await sb.from("sb_workflows").insert({ ...body, workspace_id: workspaceId, created_by: userId });
    setBusy(false);
    if (error) return toast("error", error.message);
    toast("success", "Workflow saved"); onSaved();
  }
  return (
    <Modal title={initial ? "Edit workflow" : "New workflow"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2"><div><label className="label">Workflow name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><label className="label">Trigger</label><select className="input" value={trigger} onChange={(e) => setTrigger(e.target.value)}>{Object.entries(TRIGGERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div></div>
        <div><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold text-navy">Conditions (all must match)</h3><button type="button" className="text-sm text-teal" onClick={() => setConds([...conds, { field: "score", op: "gte", value: "" }])}>Add condition</button></div>
          {conds.length === 0 && <p className="text-xs text-muted">No conditions: runs every time the trigger fires.</p>}
          {conds.map((c, i) => <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"><select className="input" value={c.field} onChange={(e) => setConds(conds.map((x, j) => j === i ? { ...x, field: e.target.value } : x))}>{FIELDS.map((f) => <option key={f}>{f}</option>)}</select><select className="input" value={c.op} onChange={(e) => setConds(conds.map((x, j) => j === i ? { ...x, op: e.target.value } : x))}>{OPS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><input className="input" value={c.value} onChange={(e) => setConds(conds.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} aria-label="Value" /><button type="button" className="text-red-600" onClick={() => setConds(conds.filter((_, j) => j !== i))}>Remove</button></div>)}</div>
        <div><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold text-navy">Actions</h3><button type="button" className="text-sm text-teal" onClick={() => setActs([...acts, { type: "notify", params: {} }])}>Add action</button></div>
          {acts.map((a, i) => <div key={i} className="mb-3 rounded-xl border border-slate-200 p-3"><div className="flex gap-2"><select className="input" value={a.type} onChange={(e) => setAct(i, { type: e.target.value, params: {} })}>{Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><button type="button" className="text-red-600" onClick={() => setActs(acts.filter((_, j) => j !== i))}>Remove</button></div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {a.type === "notify" && <><select className="input" value={a.params.user_id ?? "all"} onChange={(e) => setAct(i, { ...a, params: { ...a.params, user_id: e.target.value } })}><option value="all">All owners and admins</option><option value="owner">Record owner</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select><input className="input" placeholder="Title" value={a.params.title ?? ""} onChange={(e) => setAct(i, { ...a, params: { ...a.params, title: e.target.value } })} /><input className="input sm:col-span-2" placeholder="Message, supports {{name}}" value={a.params.body ?? ""} onChange={(e) => setAct(i, { ...a, params: { ...a.params, body: e.target.value } })} /></>}
              {a.type === "assign_owner" && <select className="input" value={a.params.user_id ?? "round_robin"} onChange={(e) => setAct(i, { ...a, params: { user_id: e.target.value } })}><option value="round_robin">Round robin across team</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}
              {a.type === "create_task" && <><input className="input" placeholder="Task title, supports {{name}}" value={a.params.title ?? ""} onChange={(e) => setAct(i, { ...a, params: { ...a.params, title: e.target.value } })} /><input className="input" type="number" min={0} placeholder="Due in days" value={a.params.due_days ?? ""} onChange={(e) => setAct(i, { ...a, params: { ...a.params, due_days: e.target.value } })} /></>}
              {a.type === "update_status" && <select className="input" value={a.params.status ?? ""} onChange={(e) => setAct(i, { ...a, params: { status: e.target.value } })}><option value="">Select status</option>{LEAD_STATUS.map((s) => <option key={s}>{s}</option>)}</select>}
              {a.type === "slack" && <input className="input sm:col-span-2" placeholder="Message, supports {{name}}" value={a.params.message ?? ""} onChange={(e) => setAct(i, { ...a, params: { message: e.target.value } })} />}
              {a.type === "webhook" && <p className="text-xs text-muted sm:col-span-2">Sends the record as JSON to the endpoint connected in Integrations.</p>}
            </div></div>)}</div>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-sm" disabled={busy}>{busy ? "Saving..." : "Save workflow"}</button></div>
      </form>
    </Modal>
  );
}
