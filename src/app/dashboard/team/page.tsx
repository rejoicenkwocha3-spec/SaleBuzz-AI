"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { Badge, Card, Confirm, PageHeader, useToast } from "@/components/app/ui";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const ROLES = ["admin", "member", "viewer"];

export default function TeamPage() {
  const { sb, workspaceId, userId, members, canManage } = useApp();
  const toast = useToast();
  const [invites, setInvites] = useState<Row[]>([]); const [email, setEmail] = useState(""); const [role, setRole] = useState("member"); const [rm, setRm] = useState<Row | null>(null);
  const load = useCallback(async () => { if (!canManage) return; const { data } = await sb.from("sb_invites").select("*").eq("workspace_id", workspaceId); setInvites(data ?? []); }, [sb, workspaceId, canManage]);
  useEffect(() => { load(); }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const addr = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(addr)) return toast("error", "Enter a valid email address");
    if (members.some((m) => m.email?.toLowerCase() === addr)) return toast("error", "That person is already on the team");
    const { error } = await sb.from("sb_invites").upsert({ workspace_id: workspaceId, email: addr, role, invited_by: userId }, { onConflict: "workspace_id,email" });
    if (error) return toast("error", error.message);
    toast("success", `Invitation saved. ${addr} joins this workspace when they sign up with that email.`); setEmail(""); load();
  }
  async function changeRole(m: Row, r: string) { const { error } = await sb.from("sb_workspace_members").update({ role: r }).eq("workspace_id", workspaceId).eq("user_id", m.id); if (error) toast("error", error.message); else { toast("success", "Role updated"); location.reload(); } }
  async function remove() { if (!rm) return; const { error } = await sb.from("sb_workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", rm.id); if (error) toast("error", error.message); else { toast("success", "Member removed"); location.reload(); } setRm(null); }
  async function revoke(i: Row) { await sb.from("sb_invites").delete().eq("id", i.id); load(); }

  return (
    <div>
      <PageHeader title="Team" text="People with access to this workspace." />
      {canManage && <Card className="mb-6"><form onSubmit={invite} className="flex flex-col gap-2 sm:flex-row"><input className="input" type="email" placeholder="teammate@company.com" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} /><select className="input sm:w-40" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">{ROLES.map((r) => <option key={r}>{r}</option>)}</select><button className="btn-sm">Invite</button></form>
        <p className="mt-2 text-xs text-muted">Invitations are matched by email: when this person creates an account with the same address, they are added automatically. Share the sign up link with them. Roles: admin manages everything, member edits records, viewer is read only.</p></Card>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[480px]"><thead className="border-b border-slate-100"><tr><th className="th">Name</th><th className="th">Email</th><th className="th">Role</th><th className="th" /></tr></thead>
        <tbody>{members.map((m) => <tr key={m.id} className="border-b border-slate-50 last:border-0"><td className="td font-medium">{m.name}{m.id === userId && <span className="ml-2 text-xs text-muted">you</span>}</td><td className="td">{m.email}</td>
          <td className="td">{canManage && m.role !== "owner" && m.id !== userId ? <select className="input w-32 py-1" value={m.role} onChange={(e) => changeRole(m, e.target.value)} aria-label="Role">{ROLES.map((r) => <option key={r}>{r}</option>)}</select> : <Badge tone={m.role === "owner" ? "teal" : "slate"}>{m.role}</Badge>}</td>
          <td className="td text-right">{canManage && m.role !== "owner" && m.id !== userId && <button className="text-red-600" onClick={() => setRm(m)}>Remove</button>}</td></tr>)}</tbody></table></div>
      {invites.length > 0 && <><h2 className="mb-2 mt-8 font-bold text-navy">Pending invitations</h2><div className="space-y-2">{invites.map((i) => <Card key={i.id} className="flex items-center justify-between py-3 text-sm"><span>{i.email} <Badge>{i.role}</Badge></span><button className="text-red-600" onClick={() => revoke(i)}>Revoke</button></Card>)}</div></>}
      {rm && <Confirm title="Remove member" text={`Remove ${rm.name} from this workspace? They lose access immediately.`} confirmLabel="Remove" onConfirm={remove} onCancel={() => setRm(null)} />}
    </div>
  );
}
