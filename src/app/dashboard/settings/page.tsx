"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app/AppProvider";
import { Card, Modal, PageHeader, fdt, useToast } from "@/components/app/ui";
import { CRITERIA_LABELS, DEFAULT_WEIGHTS } from "@/lib/scoring";
import { rescoreLeads } from "@/lib/client/helpers";
import { passwordSchema } from "@/lib/validation";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"];
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export default function SettingsPage() {
  const app = useApp(); const { sb, workspaceId, userId, userEmail, canManage, workspaceName } = app;
  const toast = useToast(); const router = useRouter();
  const [name, setName] = useState(""); const [wsName, setWsName] = useState(workspaceName);
  const [inds, setInds] = useState((app.prefs.target_industries ?? []).join(", ")); const [titles, setTitles] = useState((app.prefs.target_titles ?? []).join(", "));
  const [sizes, setSizes] = useState<string[]>(app.prefs.target_sizes ?? []);
  const [w, setW] = useState<Record<string, number>>({ ...DEFAULT_WEIGHTS, ...app.scoring });
  const [pw, setPw] = useState(""); const [logs, setLogs] = useState<Row[]>([]); const [del, setDel] = useState(false); const [confirm, setConfirm] = useState("");

  useEffect(() => {
    sb.from("sb_profiles").select("full_name").eq("id", userId).maybeSingle().then(({ data }) => setName(data?.full_name ?? ""));
    if (canManage) sb.from("sb_audit_logs").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(25).then(({ data }) => setLogs(data ?? []));
  }, [sb, userId, workspaceId, canManage]);

  async function saveProfile(e: React.FormEvent) { e.preventDefault(); const { error } = await sb.from("sb_profiles").update({ full_name: name.trim() }).eq("id", userId); if (error) toast("error", error.message); else { await sb.auth.updateUser({ data: { full_name: name.trim() } }); toast("success", "Profile saved"); router.refresh(); } }
  async function savePw(e: React.FormEvent) { e.preventDefault(); const p = passwordSchema.safeParse(pw); if (!p.success) return toast("error", p.error.issues[0].message); const { error } = await sb.auth.updateUser({ password: pw }); if (error) toast("error", error.message); else { toast("success", "Password changed"); setPw(""); } }
  async function saveWs(e: React.FormEvent) {
    e.preventDefault();
    const prefs = { ...app.prefs, target_industries: list(inds), target_titles: list(titles), target_sizes: sizes };
    const scoring = Object.fromEntries(Object.entries(w).map(([k, v]) => [k, Math.max(0, Math.min(100, Number(v) || 0))]));
    const { error } = await sb.from("sb_workspaces").update({ name: wsName.trim(), preferences: prefs, scoring }).eq("id", workspaceId);
    if (error) return toast("error", error.message);
    await sb.from("sb_audit_logs").insert({ workspace_id: workspaceId, user_id: userId, action: "workspace.settings", entity: "workspace", entity_id: workspaceId });
    const n = await rescoreLeads(sb, workspaceId, prefs, scoring);
    toast("success", `Settings saved. Rescored ${n} leads.`); router.refresh();
  }
  async function deleteAccount() {
    const r = await fetch("/api/account/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm }) }); const j = await r.json().catch(() => ({}));
    if (!r.ok) return toast("error", j.error); await sb.auth.signOut(); router.replace("/");
  }
  const total = Object.values(w).reduce((a, b) => a + (Number(b) || 0), 0);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" />
      <Card><h2 className="mb-3 font-bold text-navy">Profile</h2>
        <form onSubmit={saveProfile} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><div><label className="label" htmlFor="pn">Full name</label><input id="pn" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div><div><label className="label">Email</label><input className="input" value={userEmail} disabled /></div><button className="btn-sm">Save</button></form>
        <form onSubmit={savePw} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><div><label className="label" htmlFor="np">New password</label><input id="np" type="password" autoComplete="new-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} /></div><button className="btn-ghost">Change password</button></form></Card>
      {canManage ? (
        <form onSubmit={saveWs} className="space-y-6">
          <Card><h2 className="mb-3 font-bold text-navy">Workspace and sales preferences</h2>
            <div className="space-y-3"><div><label className="label" htmlFor="wn">Workspace name</label><input id="wn" className="input" value={wsName} onChange={(e) => setWsName(e.target.value)} required /></div>
              <div><label className="label" htmlFor="ti">Target industries (comma separated)</label><input id="ti" className="input" value={inds} onChange={(e) => setInds(e.target.value)} placeholder="Software, Financial services" /></div>
              <div><label className="label" htmlFor="tt">Target job titles (comma separated)</label><input id="tt" className="input" value={titles} onChange={(e) => setTitles(e.target.value)} placeholder="VP Sales, Head of Revenue" /></div>
              <fieldset><legend className="label">Target company sizes</legend><div className="flex flex-wrap gap-3 text-sm">{SIZES.map((s) => <label key={s} className="flex items-center gap-1.5"><input type="checkbox" checked={sizes.includes(s)} onChange={(e) => setSizes(e.target.checked ? [...sizes, s] : sizes.filter((x) => x !== s))} />{s}</label>)}</div></fieldset></div></Card>
          <Card><h2 className="font-bold text-navy">Lead scoring rules</h2><p className="mb-3 mt-1 text-sm text-muted">Maximum points per criterion. Scores are normalized to 100, and every lead shows its reasons. Current total: {total}.</p>
            <div className="grid gap-3 sm:grid-cols-2">{Object.keys(DEFAULT_WEIGHTS).map((k) => <div key={k}><label className="label" htmlFor={k}>{CRITERIA_LABELS[k]}</label><input id={k} type="number" min={0} max={100} className="input" value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} /></div>)}</div>
            <button type="button" className="mt-3 text-sm text-teal" onClick={() => setW({ ...DEFAULT_WEIGHTS })}>Reset to defaults</button></Card>
          <button className="btn-sm">Save workspace settings and rescore leads</button>
        </form>
      ) : <Card><p className="text-sm text-muted">Only owners and admins can change workspace settings.</p></Card>}
      {canManage && <Card><h2 className="mb-3 font-bold text-navy">Data controls</h2>
        <p className="text-sm text-muted">Export every record in this workspace as JSON. Exports are recorded in the audit log.</p>
        <a className="btn-ghost mt-3" href={`/api/account/export?workspaceId=${workspaceId}`}>Export workspace data</a>
        <h3 className="mt-6 text-sm font-bold text-navy">Recent audit log</h3>
        {logs.length === 0 ? <p className="mt-2 text-sm text-muted">No entries yet.</p> : <ul className="mt-2 divide-y divide-slate-100 text-xs">{logs.map((l) => <li key={l.id} className="flex justify-between py-1.5"><span>{l.action} {l.entity ? `(${l.entity})` : ""}</span><span className="text-muted">{app.members.find((m) => m.id === l.user_id)?.name ?? ""} · {fdt(l.created_at)}</span></li>)}</ul>}</Card>}
      <Card className="border-red-200"><h2 className="mb-2 font-bold text-red-700">Delete account</h2><p className="text-sm text-muted">Permanently deletes your login, and every workspace you own with all of its data. This cannot be undone.</p><button className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setDel(true)}>Delete my account</button></Card>
      {del && <Modal title="Delete account" onClose={() => setDel(false)}><p className="text-sm text-muted">This permanently deletes your login and every workspace you own. Type <strong>{userEmail}</strong> to confirm.</p><input className="input mt-3" aria-label="Confirm email" value={confirm} onChange={(e) => setConfirm(e.target.value)} /><div className="mt-4 flex justify-end gap-2"><button className="btn-ghost" onClick={() => setDel(false)}>Cancel</button><button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={confirm !== userEmail} onClick={deleteAccount}>Delete permanently</button></div></Modal>}
    </div>
  );
}
