"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/app/AppProvider";
import { Bars, Card, Skeleton, Stat, fdt, money, PageHeader } from "@/components/app/ui";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function Overview() {
  const { sb, workspaceId, prefs, members, hasAccess } = useApp();
  const [d, setD] = useState<Row | null>(null);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const [leads, opps, sigs, acts, tasks, ints, convs, invites] = await Promise.all([
        sb.from("sb_leads").select("id,name,status,intent,score,owner_id,created_at").eq("workspace_id", workspaceId).limit(10000),
        sb.from("sb_opportunities").select("stage,value").eq("workspace_id", workspaceId).limit(10000),
        sb.from("sb_signals").select("id,title,type,strength,source,occurred_at").eq("workspace_id", workspaceId).order("occurred_at", { ascending: false }).limit(8),
        sb.from("sb_activities").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("created_at", since),
        sb.from("sb_tasks").select("id,title,due_at,status").eq("workspace_id", workspaceId).eq("status", "open").order("due_at", { ascending: true, nullsFirst: false }).limit(50),
        sb.from("sb_integrations").select("provider").eq("workspace_id", workspaceId).eq("status", "connected"),
        sb.from("sb_ai_conversations").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
        sb.from("sb_invites").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
      ]);
      setD({ leads: leads.data ?? [], opps: opps.data ?? [], sigs: sigs.data ?? [], acts: acts.count ?? 0, tasks: tasks.data ?? [], ints: ints.data?.length ?? 0, convs: convs.count ?? 0, invites: invites.count ?? 0 });
    })();
  }, [sb, workspaceId]);

  if (!d) return <><PageHeader title="Overview" /><Skeleton rows={6} /></>;
  const leads = d.leads as Row[], opps = d.opps as Row[];
  const since = Date.now() - 30 * 86400_000;
  const active = opps.filter((o) => !["won", "lost"].includes(o.stage));
  const converted = leads.filter((l) => l.status === "converted").length;
  const byStatus = ["new", "contacted", "qualified", "unqualified", "converted"].map((s) => ({ label: s, value: leads.filter((l) => l.status === s).length }));
  const byStage = ["qualification", "discovery", "proposal", "negotiation", "won"].map((s) => ({ label: s, value: opps.filter((o) => o.stage === s).reduce((a, o) => a + Number(o.value || 0), 0) }));
  const weeks = Array.from({ length: 6 }, (_, i) => { const end = Date.now() - i * 7 * 86400_000; return { label: new Date(end).toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: leads.filter((l) => { const t = new Date(l.created_at).getTime(); return t <= end && t > end - 7 * 86400_000; }).length }; }).reverse();

  const actions: { text: string; href: string }[] = [];
  const hot = leads.filter((l) => l.status === "new" && l.score >= 50).sort((a, b) => b.score - a.score).slice(0, 3);
  hot.forEach((l) => actions.push({ text: `Contact ${l.name}: score ${l.score}, not yet contacted`, href: "/dashboard/leads" }));
  const unowned = leads.filter((l) => l.intent === "high" && !l.owner_id).length;
  if (unowned) actions.push({ text: `Assign an owner to ${unowned} high intent lead${unowned > 1 ? "s" : ""}`, href: "/dashboard/leads" });
  const overdue = (d.tasks as Row[]).filter((t) => t.due_at && new Date(t.due_at).getTime() < Date.now()).length;
  if (overdue) actions.push({ text: `${overdue} overdue task${overdue > 1 ? "s" : ""} need attention`, href: "/dashboard/leads" });

  const steps = [
    { done: true, label: "Create your workspace", href: "/dashboard/settings" },
    { done: members.length > 1 || d.invites > 0, label: "Add team members", href: "/dashboard/team" },
    { done: d.ints > 0, label: "Connect an integration", href: "/dashboard/integrations" },
    { done: leads.length > 0, label: "Import or add leads", href: "/dashboard/leads" },
    { done: !!(prefs.target_industries?.length || prefs.target_titles?.length), label: "Configure your sales preferences", href: "/dashboard/settings" },
    { done: d.convs > 0, label: "Explore the AI assistant", href: "/dashboard/assistant" },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div>
      <PageHeader title="Overview" text="Live figures from your workspace records." />
      {!hasAccess && <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">AI features need an active plan. <Link href="/dashboard/billing" className="font-semibold underline">Open Billing</Link> to subscribe.</div>}
      {doneCount < steps.length && (
        <Card className="mb-6"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-navy">Get started</h2><span className="text-sm text-muted">{doneCount} of {steps.length} complete</span></div>
          <div className="mb-4 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-gradient-to-r from-teal to-lime" style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
          <ul className="grid gap-2 sm:grid-cols-2">{steps.map((s) => <li key={s.label}><Link href={s.href} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-canvas"><span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${s.done ? "bg-emerald text-white" : "border border-slate-300"}`}>{s.done ? "✓" : ""}</span><span className={s.done ? "text-muted line-through" : ""}>{s.label}</span></Link></li>)}</ul>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total leads" value={leads.length} />
        <Stat label="New leads, last 30 days" value={leads.filter((l) => new Date(l.created_at).getTime() >= since).length} />
        <Stat label="Qualified prospects" value={leads.filter((l) => l.status === "qualified").length} />
        <Stat label="High intent leads" value={leads.filter((l) => l.intent === "high").length} />
        <Stat label="Active opportunities" value={active.length} />
        <Stat label="Pipeline value" value={money(active.reduce((a, o) => a + Number(o.value || 0), 0))} />
        <Stat label="Conversion rate" value={leads.length ? `${((converted / leads.length) * 100).toFixed(1)}%` : "0%"} hint={`${converted} converted`} />
        <Stat label="Activities, last 30 days" value={d.acts} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><h2 className="mb-4 font-bold text-navy">New leads per week</h2><Bars data={weeks} color="#10B981" /></Card>
        <Card><h2 className="mb-4 font-bold text-navy">Leads by status</h2><Bars data={byStatus} /></Card>
        <Card><h2 className="mb-4 font-bold text-navy">Pipeline value by stage</h2><Bars data={byStage} color="#102A43" format={money} /></Card>
        <Card><h2 className="mb-4 font-bold text-navy">Recommended next actions</h2>
          {actions.length === 0 ? <p className="text-sm text-muted">No recommendations yet. They appear as leads, scores, and tasks accumulate.</p> :
            <ul className="space-y-2">{actions.map((a, i) => <li key={i}><Link href={a.href} className="block rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-canvas">{a.text}</Link></li>)}</ul>}</Card>
        <Card className="lg:col-span-2"><div className="mb-3 flex justify-between"><h2 className="font-bold text-navy">Recent buying signals</h2><Link href="/dashboard/signals" className="text-sm text-teal">View all</Link></div>
          {(d.sigs as Row[]).length === 0 ? <p className="text-sm text-muted">No signals received yet. Send events to your webhook or add them manually.</p> :
            <ul className="divide-y divide-slate-100">{(d.sigs as Row[]).map((s) => <li key={s.id} className="flex justify-between gap-4 py-2 text-sm"><span>{s.title}<span className="ml-2 text-xs text-muted">{s.type} · {s.source}</span></span><span className="shrink-0 text-xs text-muted">strength {s.strength} · {fdt(s.occurred_at)}</span></li>)}</ul>}</Card>
      </div>
    </div>
  );
}
