"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { Bars, Card, PageHeader, Skeleton, Stat, money, useToast } from "@/components/app/ui";
import { download, toCsv } from "@/lib/client/helpers";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const count = (rows: Row[], key: string) => Object.entries(rows.reduce<Record<string, number>>((a, r) => { const k = r[key] || "Unknown"; a[k] = (a[k] ?? 0) + 1; return a; }, {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);

export default function AnalyticsPage() {
  const { sb, workspaceId, members } = useApp();
  const toast = useToast();
  const [from, setFrom] = useState(new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [d, setD] = useState<Row | null>(null);

  useEffect(() => {
    setD(null);
    const a = `${from}T00:00:00Z`, b = `${to}T23:59:59Z`;
    const rng = (t: string, col = "created_at") => sb.from(t).select("*").eq("workspace_id", workspaceId).gte(col, a).lte(col, b).limit(10000);
    Promise.all([rng("sb_leads"), rng("sb_opportunities"), rng("sb_activities"), rng("sb_signals", "occurred_at"), rng("sb_workflow_runs")]).then(([l, o, ac, s, w]) => setD({ leads: l.data ?? [], opps: o.data ?? [], acts: ac.data ?? [], sigs: s.data ?? [], runs: w.data ?? [] }));
  }, [sb, workspaceId, from, to]);

  function exportReport() {
    if (!d) return;
    const rows = [
      ...count(d.leads, "source").map((x) => ({ report: "Leads by source", name: x.label, value: x.value })),
      ...count(d.leads, "status").map((x) => ({ report: "Leads by status", name: x.label, value: x.value })),
      ...count(d.leads, "intent").map((x) => ({ report: "Buying intent", name: x.label, value: x.value })),
      ...count(d.opps, "stage").map((x) => ({ report: "Opportunities by stage", name: x.label, value: x.value })),
      ...count(d.sigs, "source").map((x) => ({ report: "Signals by source", name: x.label, value: x.value })),
      ...count(d.runs, "status").map((x) => ({ report: "Workflow runs", name: x.label, value: x.value })),
    ];
    download(`salesbuzz-report-${from}-to-${to}.csv`, toCsv(rows, ["report", "name", "value"])); toast("success", "Report downloaded");
  }

  if (!d) return <><PageHeader title="Analytics" /><Skeleton rows={6} /></>;
  const leads = d.leads as Row[], opps = d.opps as Row[], runs = d.runs as Row[];
  const won = opps.filter((o) => o.stage === "won"), closed = opps.filter((o) => ["won", "lost"].includes(o.stage));
  const rep = members.map((m) => ({ label: m.name, value: (d.acts as Row[]).filter((a) => a.created_by === m.id).length })).filter((x) => x.value > 0);
  const byMonth = Object.entries(opps.reduce<Record<string, number>>((a, o) => { const k = o.created_at.slice(0, 7); a[k] = (a[k] ?? 0) + Number(o.value || 0); return a; }, {})).sort().map(([label, value]) => ({ label, value }));
  const wonMonth = Object.entries(won.reduce<Record<string, number>>((a, o) => { const k = (o.updated_at ?? o.created_at).slice(0, 7); a[k] = (a[k] ?? 0) + Number(o.value || 0); return a; }, {})).sort().map(([label, value]) => ({ label, value }));
  const ok = runs.filter((r) => r.status === "success").length;
  const qualified = leads.filter((l) => ["qualified", "converted"].includes(l.status)).length;

  return (
    <div>
      <PageHeader title="Analytics" text="Reports calculated from your workspace records in the selected period." actions={<button className="btn-sm" onClick={exportReport}>Download CSV</button>} />
      <div className="mb-6 flex flex-wrap items-end gap-3"><div><label className="label" htmlFor="from">From</label><input id="from" type="date" className="input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div><div><label className="label" htmlFor="to">To</label><input id="to" type="date" className="input" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Leads generated" value={leads.length} /><Stat label="Qualification rate" value={leads.length ? `${((qualified / leads.length) * 100).toFixed(1)}%` : "0%"} />
        <Stat label="Win rate" value={closed.length ? `${((won.length / closed.length) * 100).toFixed(1)}%` : "0%"} hint={`${won.length} won of ${closed.length} closed`} /><Stat label="Revenue won" value={money(won.reduce((a, o) => a + Number(o.value || 0), 0))} />
        <Stat label="Signals received" value={(d.sigs as Row[]).length} /><Stat label="Activities logged" value={(d.acts as Row[]).length} /><Stat label="Workflow runs" value={runs.length} hint={runs.length ? `${((ok / runs.length) * 100).toFixed(0)}% succeeded` : undefined} /><Stat label="Pipeline created" value={money(opps.reduce((a, o) => a + Number(o.value || 0), 0))} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><h2 className="mb-4 font-bold text-navy">Source attribution: leads by source</h2><Bars data={count(leads, "source")} /></Card>
        <Card><h2 className="mb-4 font-bold text-navy">Lead qualification</h2><Bars data={count(leads, "status")} color="#10B981" /></Card>
        <Card><h2 className="mb-4 font-bold text-navy">Buying intent</h2><Bars data={count(leads, "intent")} color="#84CC16" /></Card>
        <Card><h2 className="mb-4 font-bold text-navy">Opportunity conversion by stage</h2><Bars data={count(opps, "stage")} color="#102A43" /></Card>
        <Card><h2 className="mb-4 font-bold text-navy">Pipeline growth by month</h2><Bars data={byMonth} format={money} color="#0D9488" /></Card>
        <Card><h2 className="mb-4 font-bold text-navy">Revenue performance by month</h2><Bars data={wonMonth} format={money} color="#10B981" /></Card>
        <Card><h2 className="mb-4 font-bold text-navy">Sales representative activity</h2><Bars data={rep} color="#0D9488" /></Card>
        <Card><h2 className="mb-4 font-bold text-navy">Signals by source (campaign and channel performance)</h2><Bars data={count(d.sigs, "source")} color="#84CC16" /></Card>
        <Card><h2 className="mb-4 font-bold text-navy">Workflow performance</h2><Bars data={count(runs, "status")} color="#102A43" /></Card>
      </div>
    </div>
  );
}
