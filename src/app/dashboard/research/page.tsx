"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/app/AppProvider";
import { Badge, Card, EmptyState, PageHeader, Skeleton, fdt, useToast } from "@/components/app/ui";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const LABELS: Record<string, string> = { overview: "Company overview", products_and_services: "Products and services", industry: "Industry", target_customers: "Target customers", recent_developments: "Recent public developments", potential_challenges: "Potential business challenges", buying_opportunities: "Possible buying opportunities", decision_makers: "Relevant decision makers", suggested_approach: "Suggested sales approach", next_steps: "Recommended next steps" };

export default function ResearchPage() {
  const { sb, workspaceId, canWrite, hasAccess } = useApp();
  const toast = useToast();
  const [companies, setCompanies] = useState<Row[]>([]);
  const [reports, setReports] = useState<Row[] | null>(null);
  const [companyId, setCompanyId] = useState(""); const [name, setName] = useState(""); const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false); const [open, setOpen] = useState<Row | null>(null);

  const load = useCallback(async () => {
    const [c, r] = await Promise.all([sb.from("sb_companies").select("id,name").eq("workspace_id", workspaceId).order("name").limit(500), sb.from("sb_ai_reports").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(30)]);
    setCompanies(c.data ?? []); setReports(r.data ?? []);
  }, [sb, workspaceId]);
  useEffect(() => { load(); }, [load]);

  async function generate(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const res = await fetch("/api/ai/research", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId, companyId: companyId || undefined, companyName: name, notes }) });
    const j = await res.json().catch(() => ({ error: "Request failed" })); setBusy(false);
    if (!res.ok) return toast("error", j.error);
    toast("success", "Report generated"); setOpen(j.report); load();
  }

  return (
    <div>
      <PageHeader title="AI Research" text="Account intelligence reports grounded in your workspace data and the company's own website." />
      {!hasAccess && <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">An active plan is required to generate reports. <Link href="/dashboard/billing" className="font-semibold underline">Open Billing</Link></div>}
      {canWrite && <Card className="mb-6"><form onSubmit={generate} className="grid gap-3 md:grid-cols-2">
        <div><label className="label" htmlFor="rc">Existing company</label><select id="rc" className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)}><option value="">Enter a name instead</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="label" htmlFor="rn">Or company name</label><input id="rn" className="input" disabled={!!companyId} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="md:col-span-2"><label className="label" htmlFor="rno">Notes for the researcher (optional)</label><textarea id="rno" rows={3} className="input" placeholder="Anything you know: what they sell, why they are a fit, recent conversations" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <div className="md:col-span-2 flex items-center justify-between gap-3"><p className="text-xs text-muted">The AI has no live web access. Sections the data cannot support are marked as unavailable, and inferences are labeled.</p><button className="btn-sm" disabled={busy || (!companyId && !name.trim())}>{busy ? "Generating..." : "Generate report"}</button></div>
      </form></Card>}
      {!reports ? <Skeleton /> : reports.length === 0 ? <EmptyState title="No reports yet" text="Pick a company and generate your first account report." /> : (
        <div className="grid gap-3 sm:grid-cols-2">{reports.map((r) => <button key={r.id} onClick={() => setOpen(r)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-teal"><p className="font-semibold text-navy">{r.company_name}</p><p className="mt-1 text-xs text-muted">{fdt(r.created_at)} · {r.model}</p></button>)}</div>
      )}
      {open && <Report r={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Report({ r, onClose }: { r: Row; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-deep/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-2 flex items-start justify-between"><div><h2 className="text-xl font-bold text-navy">{r.company_name}</h2><div className="mt-1 flex items-center gap-2"><Badge tone="amber">AI generated</Badge><span className="text-xs text-muted">{fdt(r.created_at)} · model {r.model}</span></div></div><button onClick={onClose} className="text-sm text-muted">Close</button></div>
        <div className="mt-4 rounded-xl bg-canvas p-3 text-xs"><p className="font-semibold text-navy">Sources used</p>{(r.sources as Row[]).length ? <ul className="mt-1 list-disc pl-4 text-muted">{(r.sources as Row[]).map((s, i) => <li key={i}>{s.label}: {s.detail}</li>)}</ul> : <p className="text-muted">No sources were available. Treat this report as unverified.</p>}</div>
        {Object.keys(LABELS).map((k) => <section key={k} className="mt-5"><h3 className="text-sm font-bold uppercase tracking-wide text-teal">{LABELS[k]}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-ink">{r.content[k] ?? "Not available from connected data."}</p></section>)}
      </div>
    </div>
  );
}
