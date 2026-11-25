"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "./AppProvider";
import { Badge, Confirm, EmptyState, Modal, PageHeader, Skeleton, fdate, money, useToast } from "./ui";
import { ENTITIES, type Entity, type Field } from "@/lib/entities";
import { audit, download, parseCsv, rescoreLeads, toCsv, triggerWorkflow } from "@/lib/client/helpers";
import { RecordDrawer } from "./RecordDrawer";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const PAGE = 15;
const toneFor = (v: string) => (["qualified", "converted", "high", "won", "granted"].includes(v) ? "green" : ["medium", "contacted", "proposal", "negotiation"].includes(v) ? "amber" : ["unqualified", "lost", "withdrawn"].includes(v) ? "red" : "slate") as "green" | "amber" | "red" | "slate";

export function ResourceManager({ entityKey }: { entityKey: string }) {
  const ent: Entity = ENTITIES[entityKey];
  const app = useApp();
  const { sb, workspaceId, userId, members, canWrite, canManage } = app;
  const toast = useToast();

  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState({ col: ent.sort, asc: false });
  const [view, setView] = useState<"table" | "pipeline">("table");
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [saved, setSaved] = useState<{ id: string; name: string; filters: Record<string, string> }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const hasCompany = ent.fields.some((f) => f.type === "company");
  const companyName = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.name])), [companies]);
  const ownerName = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.name])), [members]);

  useEffect(() => { const q = new URLSearchParams(window.location.search).get("q"); if (q) setSearch(q); }, []);
  useEffect(() => { if (hasCompany) sb.from("sb_companies").select("id,name").eq("workspace_id", workspaceId).order("name").limit(500).then(({ data }) => setCompanies(data ?? [])); }, [sb, workspaceId, hasCompany]);
  const loadMeta = useCallback(async () => {
    if (!ent.discovery) return;
    const [l, s] = await Promise.all([sb.from("sb_lists").select("id,name").eq("workspace_id", workspaceId).order("name"), sb.from("sb_saved_searches").select("id,name,filters").eq("workspace_id", workspaceId).order("name")]);
    setLists(l.data ?? []); setSaved((s.data as typeof saved) ?? []);
  }, [sb, workspaceId, ent.discovery]);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  const applyFilters = useCallback((q: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const [k, v] of Object.entries(ent.base ?? {})) q = q.eq(k, v);
    for (const f of ent.filters) { const v = filters[f.key]; if (!v) continue; q = f.type === "select" ? q.eq(f.key, v) : q.ilike(f.key, `%${v.replace(/[%,()]/g, "")}%`); }
    const term = search.trim().replace(/[%,()]/g, "");
    if (term) q = q.or(ent.search.map((k) => `${k}.ilike.%${term}%`).join(","));
    return q;
  }, [ent, filters, search]);

  const load = useCallback(async () => {
    setLoading(true);
    const pipe = view === "pipeline" && ent.pipeline;
    let q = sb.from(ent.table).select("*", { count: "exact" }).eq("workspace_id", workspaceId);
    q = applyFilters(q).order(sort.col, { ascending: sort.asc });
    q = pipe ? q.range(0, 299) : q.range(page * PAGE, page * PAGE + PAGE - 1);
    const { data, count: c, error } = await q;
    if (error) toast("error", error.message);
    setRows(data ?? []); setCount(c ?? 0); setLoading(false); setSelected([]);
  }, [sb, ent, workspaceId, applyFilters, sort, page, view, toast]);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { clearTimeout(t.current); t.current = setTimeout(load, 200); return () => clearTimeout(t.current); }, [load]);
  useEffect(() => setPage(0), [search, filters, view]);

  const cols = ent.fields.filter((f) => f.table);
  const cell = (r: Row, f: Field) => {
    const v = r[f.key];
    if (f.type === "owner") return v ? ownerName[v] ?? "Unknown" : <span className="text-muted">Unassigned</span>;
    if (f.type === "company") return v ? companyName[v] ?? "" : "";
    if (f.type === "bool") return v ? <Badge tone="teal">Yes</Badge> : "No";
    if (f.type === "date") return fdate(v);
    if (f.key === "value") return money(Number(v || 0));
    if (f.key === "status" || f.key === "intent" || f.key === "stage" || f.key === "consent_status") return v ? <Badge tone={toneFor(v)}>{v}</Badge> : "";
    return v ?? "";
  };

  async function afterSave(row: Row, isNew: boolean, prev?: Row) {
    if (ent.key === "leads") {
      await rescoreLeads(sb, workspaceId, app.prefs, app.scoring, [row.id]);
      const { data: fresh } = await sb.from("sb_leads").select("score").eq("id", row.id).single();
      if (isNew) await triggerWorkflow(workspaceId, "lead_created", "lead", row.id);
      if (prev && prev.status !== row.status) await triggerWorkflow(workspaceId, "status_changed", "lead", row.id);
      if ((fresh?.score ?? 0) !== (prev?.score ?? 0)) await triggerWorkflow(workspaceId, "score_threshold", "lead", row.id);
    }
    if (ent.key === "opportunities" && prev && prev.stage !== row.stage) await triggerWorkflow(workspaceId, "status_changed", "opportunity", row.id);
  }

  async function save(values: Row) {
    const isNew = editing === "new";
    const payload: Row = { ...values };
    if (ent.base) Object.assign(payload, ent.base);
    let res;
    if (isNew) res = await sb.from(ent.table).insert({ ...payload, workspace_id: workspaceId, owner_id: payload.owner_id ?? (ent.fields.some((f) => f.type === "owner") ? userId : undefined) }).select().single();
    else res = await sb.from(ent.table).update({ ...payload, updated_at: new Date().toISOString() }).eq("id", (editing as Row).id).select().single();
    if (res.error) { toast("error", res.error.message); return false; }
    await afterSave(res.data, isNew, isNew ? undefined : (editing as Row));
    await audit(sb, workspaceId, userId, isNew ? `${ent.singular}.create` : `${ent.singular}.update`, ent.table, res.data.id);
    toast("success", `${ent.singular[0].toUpperCase()}${ent.singular.slice(1)} ${isNew ? "created" : "updated"}`);
    setEditing(null); load(); return true;
  }
  async function remove() {
    if (!deleting) return;
    const { error } = await sb.from(ent.table).delete().eq("id", deleting.id);
    if (error) toast("error", canManage ? error.message : "Only owners and admins can delete records"); else { toast("success", "Deleted"); await audit(sb, workspaceId, userId, `${ent.singular}.delete`, ent.table, deleting.id); }
    setDeleting(null); load();
  }
  async function move(r: Row, stage: string) {
    const { error } = await sb.from(ent.table).update({ [ent.pipeline!.field]: stage }).eq("id", r.id);
    if (error) return toast("error", error.message);
    await afterSave({ ...r, [ent.pipeline!.field]: stage }, false, r); load();
  }
  async function exportCsv() {
    let q = sb.from(ent.table).select("*").eq("workspace_id", workspaceId);
    const { data, error } = await applyFilters(q).order(sort.col, { ascending: sort.asc }).limit(5000);
    if (error) return toast("error", error.message);
    const keys = [...ent.fields.map((f) => f.key), "created_at"];
    download(`salesbuzz-${ent.key}.csv`, toCsv(data ?? [], keys));
    await audit(sb, workspaceId, userId, `${ent.singular}.export`, ent.table);
    toast("success", `Exported ${data?.length ?? 0} records`);
  }
  async function saveSearch() {
    const name = window.prompt("Name this search");
    if (!name?.trim()) return;
    const { error } = await sb.from("sb_saved_searches").insert({ workspace_id: workspaceId, name: name.trim(), filters: { ...filters, _q: search }, created_by: userId });
    if (error) return toast("error", error.message);
    toast("success", "Search saved"); loadMeta();
  }
  async function addToList(listId: string) {
    if (!selected.length) return toast("error", "Select leads in the table first");
    const { error } = await sb.from("sb_list_items").upsert(selected.map((id) => ({ workspace_id: workspaceId, list_id: listId, lead_id: id })), { onConflict: "list_id,lead_id" });
    if (error) return toast("error", error.message);
    toast("success", `Added ${selected.length} to list`); setSelected([]);
  }
  async function newList() {
    const name = window.prompt("Name your prospect list");
    if (!name?.trim()) return;
    const { data, error } = await sb.from("sb_lists").insert({ workspace_id: workspaceId, name: name.trim(), created_by: userId }).select().single();
    if (error) return toast("error", error.message);
    toast("success", "List created"); await loadMeta(); if (selected.length && data) addToList(data.id);
  }
  async function rescoreAll() {
    toast("success", "Recalculating scores");
    const n = await rescoreLeads(sb, workspaceId, app.prefs, app.scoring);
    toast("success", `Updated ${n} lead scores`); load();
  }

  const pages = Math.max(1, Math.ceil(count / PAGE));
  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <div>
      <PageHeader title={ent.title} text={ent.text} actions={<>
        {ent.pipeline && <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-sm">{(["table", "pipeline"] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`px-3 py-2 ${view === v ? "bg-navy text-white" : "bg-white"}`}>{v === "table" ? "Table" : "Pipeline"}</button>)}</div>}
        {canWrite && <button className="btn-ghost" onClick={() => setImporting(true)}>Import CSV</button>}
        <button className="btn-ghost" onClick={exportCsv}>Export CSV</button>
        {ent.key === "leads" && canWrite && <button className="btn-ghost" onClick={rescoreAll}>Rescore all</button>}
        {canWrite && <button className="btn-sm" onClick={() => setEditing("new")}>New {ent.singular}</button>}
      </>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" type="search" placeholder={`Search ${ent.title.toLowerCase()}`} aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
        {ent.filters.length > 0 && <button className="btn-ghost" onClick={() => setShowFilters(!showFilters)}>Filters{activeFilters ? ` (${activeFilters})` : ""}</button>}
        {activeFilters > 0 && <button className="text-sm text-teal" onClick={() => setFilters({})}>Clear</button>}
        {ent.discovery && (<>
          {saved.length > 0 && <select className="input w-44" aria-label="Saved searches" value="" onChange={(e) => { const s = saved.find((x) => x.id === e.target.value); if (s) { const { _q, ...f } = s.filters as Record<string, string>; setFilters(f); setSearch(_q ?? ""); setShowFilters(true); } }}><option value="">Saved searches</option>{saved.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
          {canWrite && <button className="btn-ghost" onClick={saveSearch}>Save search</button>}
          {canWrite && <select className="input w-44" aria-label="Add selected to list" value="" onChange={(e) => e.target.value === "new" ? newList() : e.target.value && addToList(e.target.value)}><option value="">Add selected to list</option>{lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}<option value="new">New list</option></select>}
        </>)}
      </div>
      {showFilters && (
        <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          {ent.filters.map((f) => (
            <label key={f.key} className="text-xs font-medium text-muted">{f.label}
              {f.type === "select" ? <select className="input mt-1" value={filters[f.key] ?? ""} onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}><option value="">Any</option>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
                : <input className="input mt-1" value={filters[f.key] ?? ""} onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })} />}
            </label>
          ))}
          {ent.discovery && <p className="text-xs text-muted sm:col-span-2 lg:col-span-4">Discovery searches the prospects in your workspace. To bring in external prospect data, import a CSV from a provider you are licensed to use, or connect an integration under Integrations.</p>}
        </div>
      )}

      {loading ? <Skeleton /> : rows.length === 0 ? (
        <EmptyState title={search || activeFilters ? "No matching records" : `No ${ent.title.toLowerCase()} yet`} text={search || activeFilters ? "Try different search terms or clear your filters." : `Add your first ${ent.singular} or import a CSV file to get started.`}
          action={canWrite && !(search || activeFilters) ? <div className="flex justify-center gap-2"><button className="btn-sm" onClick={() => setEditing("new")}>New {ent.singular}</button><button className="btn-ghost" onClick={() => setImporting(true)}>Import CSV</button></div> : undefined} />
      ) : view === "pipeline" && ent.pipeline ? (
        <div className="grid gap-3 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${ent.pipeline.stages.length}, minmax(220px, 1fr))` }}>
          {ent.pipeline.stages.map((st) => {
            const items = rows.filter((r) => r[ent.pipeline!.field] === st);
            return (
              <div key={st} className="rounded-2xl bg-slate-100/70 p-3">
                <div className="mb-2 flex items-center justify-between text-sm font-semibold capitalize text-navy"><span>{st}</span><span className="text-xs font-normal text-muted">{items.length}{ent.key === "opportunities" ? ` · ${money(items.reduce((a, r) => a + Number(r.value || 0), 0))}` : ""}</span></div>
                <div className="space-y-2">
                  {items.map((r) => (
                    <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                      <button className="text-left font-semibold text-navy hover:underline" onClick={() => setDetail(r)}>{r.name}</button>
                      <p className="text-xs text-muted">{r.company_id ? companyName[r.company_id] : ""} {money(Number(r.value || 0))}</p>
                      {canWrite && <select className="input mt-2 py-1 text-xs" aria-label="Move to stage" value={st} onChange={(e) => move(r, e.target.value)}>{ent.pipeline!.stages.map((s) => <option key={s}>{s}</option>)}</select>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-slate-100"><tr>
              {ent.discovery && <th className="th w-8"><input type="checkbox" aria-label="Select all" checked={selected.length === rows.length} onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])} /></th>}
              {cols.map((f) => <th key={f.key} className="th">{f.sortable ? <button onClick={() => setSort({ col: f.key, asc: sort.col === f.key ? !sort.asc : true })}>{f.label}{sort.col === f.key ? (sort.asc ? " ▲" : " ▼") : ""}</button> : f.label}</th>)}
              {ent.key === "leads" && <th className="th"><button onClick={() => setSort({ col: "score", asc: sort.col === "score" ? !sort.asc : false })}>Score{sort.col === "score" ? (sort.asc ? " ▲" : " ▼") : ""}</button></th>}
              <th className="th text-right">Actions</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-canvas/60">
                  {ent.discovery && <td className="td"><input type="checkbox" aria-label="Select row" checked={selected.includes(r.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, r.id] : selected.filter((x) => x !== r.id))} /></td>}
                  {cols.map((f, i) => <td key={f.key} className="td">{i === 0 ? <button className="font-semibold text-navy hover:underline" onClick={() => setDetail(r)}>{cell(r, f)}</button> : cell(r, f)}</td>)}
                  {ent.key === "leads" && <td className="td"><button onClick={() => setDetail(r)} title="Why this score?"><Badge tone={r.score >= 70 ? "green" : r.score >= 40 ? "amber" : "slate"}>{r.score}</Badge></button></td>}
                  <td className="td whitespace-nowrap text-right">
                    <button className="mr-3 text-teal" onClick={() => setDetail(r)}>Open</button>
                    {canWrite && <button className="mr-3 text-teal" onClick={() => setEditing(r)}>Edit</button>}
                    {canWrite && <button className="text-red-600" onClick={() => setDeleting(r)}>Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {view === "table" && !loading && rows.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>{count} total</span>
          <div className="flex items-center gap-2"><button className="btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} of {pages}</span><button className="btn-ghost" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</button></div>
        </div>
      )}

      {editing && <FormModal ent={ent} initial={editing === "new" ? ent.key === "accounts" ? { is_account: true } : {} : editing} companies={companies} onClose={() => setEditing(null)} onSave={save} />}
      {deleting && <Confirm title={`Delete ${ent.singular}`} text={`This permanently deletes "${deleting.name ?? deleting.first_name}" and cannot be undone.`} onConfirm={remove} onCancel={() => setDeleting(null)} />}
      {importing && <ImportModal ent={ent} onClose={() => setImporting(false)} onDone={(ids) => { setImporting(false); load(); if (ent.key === "leads") rescoreLeads(sb, workspaceId, app.prefs, app.scoring, ids).then(load); ids.slice(0, 50).forEach((id) => ent.key === "leads" && triggerWorkflow(workspaceId, "lead_created", "lead", id)); }} />}
      {detail && <RecordDrawer ent={ent} row={detail} companyName={companyName} onClose={() => setDetail(null)} onChanged={load} />}
    </div>
  );
}

function FormModal({ ent, initial, companies, onClose, onSave }: { ent: Entity; initial: Row; companies: { id: string; name: string }[]; onClose: () => void; onSave: (v: Row) => Promise<boolean> }) {
  const { members } = useApp();
  const [v, setV] = useState<Row>(() => ({ ...initial, tags: Array.isArray(initial.tags) ? initial.tags.join(", ") : initial.tags ?? "" }));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    for (const f of ent.fields) {
      const x = v[f.key];
      if (f.required && !String(x ?? "").trim()) er[f.key] = `${f.label} is required`;
      if (f.type === "email" && x && !/^\S+@\S+\.\S+$/.test(x)) er[f.key] = "Enter a valid email address";
      if (f.type === "number" && x !== "" && x != null && isNaN(Number(x))) er[f.key] = "Enter a number";
    }
    setErrs(er);
    if (Object.keys(er).length) return;
    const out: Row = {};
    for (const f of ent.fields) {
      let x = v[f.key];
      if (f.type === "tags") x = String(x || "").split(",").map((s) => s.trim()).filter(Boolean);
      else if (f.type === "number") x = x === "" || x == null ? 0 : Number(x);
      else if (f.type === "bool") x = !!x;
      else if (f.type === "owner" || f.type === "company" || f.type === "date") x = x || null;
      else if (typeof x === "string") x = x.trim() || (f.required ? x : null);
      out[f.key] = x ?? (f.type === "bool" ? false : null);
    }
    setBusy(true); const ok = await onSave(out); if (!ok) setBusy(false);
  }
  return (
    <Modal title={`${initial.id ? "Edit" : "New"} ${ent.singular}`} onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {ent.fields.map((f) => {
          const id = `f_${f.key}`; const wide = f.type === "textarea" || f.type === "tags";
          return (
            <div key={f.key} className={wide ? "sm:col-span-2" : ""}>
              {f.type === "bool" ? <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={!!v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.checked })} />{f.label}</label> : (<>
                <label htmlFor={id} className="label">{f.label}{f.required && " *"}</label>
                {f.type === "select" ? <select id={id} className="input" value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}><option value="">Select</option>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
                  : f.type === "owner" ? <select id={id} className="input" value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}><option value="">Unassigned</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                  : f.type === "company" ? <select id={id} className="input" value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}><option value="">None</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                  : f.type === "textarea" ? <textarea id={id} rows={3} className="input" value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
                  : <input id={id} className="input" type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : "text"} placeholder={f.type === "tags" ? "Comma separated" : undefined} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />}
              </>)}
              {errs[f.key] && <p className="mt-1 text-xs text-red-600">{errs[f.key]}</p>}
            </div>
          );
        })}
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-sm" disabled={busy}>{busy ? "Saving..." : "Save"}</button></div>
      </form>
    </Modal>
  );
}

function ImportModal({ ent, onClose, onDone }: { ent: Entity; onClose: () => void; onDone: (ids: string[]) => void }) {
  const { sb, workspaceId, userId } = useApp();
  const toast = useToast();
  const [rows, setRows] = useState<string[][] | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const importable = ent.fields.filter((f) => !["owner", "company", "bool"].includes(f.type ?? ""));
  const map = useMemo(() => {
    if (!rows) return [];
    return rows[0].map((h) => importable.find((f) => norm(f.key) === norm(h) || norm(f.label) === norm(h))?.key ?? null);
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const needsConsent = ent.key === "contacts" || ent.key === "leads";

  async function run() {
    if (!rows) return;
    setBusy(true);
    const body = rows.slice(1, 5001).map((r) => {
      const o: Row = { workspace_id: workspaceId, owner_id: userId, ...(ent.base ?? {}) };
      map.forEach((k, i) => { if (!k) return; const f = importable.find((x) => x.key === k)!; const val = (r[i] ?? "").trim(); o[k] = f.type === "tags" ? val.split(/[;,]/).map((s) => s.trim()).filter(Boolean) : f.type === "number" ? Number(val) || 0 : f.type === "date" ? val || null : val || null; });
      if (ent.fields.some((f) => f.key === "source") && !o.source) o.source = "CSV import";
      return o;
    }).filter((o) => ent.fields.filter((f) => f.required).every((f) => o[f.key]));
    const ids: string[] = [];
    for (let i = 0; i < body.length; i += 200) {
      const { data, error } = await sb.from(ent.table).insert(body.slice(i, i + 200)).select("id");
      if (error) { toast("error", error.message); setBusy(false); return; }
      ids.push(...(data ?? []).map((d) => d.id));
    }
    await audit(sb, workspaceId, userId, `${ent.singular}.import`, ent.table, String(ids.length));
    toast("success", `Imported ${ids.length} records`); onDone(ids);
  }
  return (
    <Modal title={`Import ${ent.title.toLowerCase()} from CSV`} onClose={onClose} wide>
      <p className="text-sm text-muted">The first row must contain column headers. Recognized columns: {importable.map((f) => f.label).join(", ")}. Up to 5000 rows.</p>
      <input type="file" accept=".csv,text/csv" className="mt-4 text-sm" aria-label="CSV file" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setRows(parseCsv(await f.text())); }} />
      {rows && (<div className="mt-4 text-sm">
        <p><strong>{Math.max(0, rows.length - 1)}</strong> rows found. Matched columns: {map.filter(Boolean).length ? map.filter(Boolean).join(", ") : <span className="text-red-600">none matched, check your headers</span>}</p>
        {needsConsent && <label className="mt-4 flex items-start gap-2"><input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>I confirm I have a lawful basis to store and use this contact information, and that it was obtained from a source I am authorized to use.</span></label>}
      </div>)}
      <div className="mt-6 flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-sm" disabled={!rows || busy || !map.some(Boolean) || (needsConsent && !consent)} onClick={run}>{busy ? "Importing..." : "Import"}</button></div>
    </Modal>
  );
}
