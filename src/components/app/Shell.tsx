"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo, LogoMark } from "@/components/Logo";
import { useApp } from "./AppProvider";
import { fdt } from "./ui";

export const NAV = [
  ["Overview", "/dashboard"], ["Leads", "/dashboard/leads"], ["Contacts", "/dashboard/contacts"], ["Companies", "/dashboard/companies"],
  ["Accounts", "/dashboard/accounts"], ["Opportunities", "/dashboard/opportunities"], ["Buying Signals", "/dashboard/signals"],
  ["AI Research", "/dashboard/research"], ["AI Assistant", "/dashboard/assistant"], ["Workflows", "/dashboard/workflows"],
  ["Analytics", "/dashboard/analytics"], ["Integrations", "/dashboard/integrations"], ["Team", "/dashboard/team"],
  ["Billing", "/dashboard/billing"], ["Settings", "/dashboard/settings"],
] as const;

type Notif = { id: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string };

export function Shell({ children, workspaces, workspaceId, email }: { children: React.ReactNode; workspaces: { id: string; name: string }[]; workspaceId: string; email: string }) {
  const { sb, userId } = useApp();
  const path = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [menu, setMenu] = useState<"" | "notif" | "user">("");
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ type: string; label: string; href: string }[] | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { setMobile(false); setMenu(""); setResults(null); }, [path]);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem("sb_collapsed") === "1"); } catch {}
  }, []);
  useEffect(() => {
    sb.from("sb_notifications").select("*").eq("user_id", userId).eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(15).then(({ data }) => setNotifs((data as Notif[]) ?? []));
  }, [sb, userId, workspaceId, path]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) { setMenu(""); setResults(null); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(null); return; }
    const t = setTimeout(async () => {
      const like = `%${term.replace(/[%,()]/g, "")}%`;
      const [l, c, co] = await Promise.all([
        sb.from("sb_leads").select("name").eq("workspace_id", workspaceId).or(`name.ilike.${like},email.ilike.${like},company_name.ilike.${like}`).limit(4),
        sb.from("sb_contacts").select("first_name,last_name").eq("workspace_id", workspaceId).or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`).limit(4),
        sb.from("sb_companies").select("name").eq("workspace_id", workspaceId).ilike("name", like).limit(4),
      ]);
      setResults([
        ...(l.data ?? []).map((r) => ({ type: "Lead", label: r.name, href: `/dashboard/leads?q=${encodeURIComponent(r.name)}` })),
        ...(c.data ?? []).map((r) => ({ type: "Contact", label: `${r.first_name} ${r.last_name ?? ""}`, href: `/dashboard/contacts?q=${encodeURIComponent(r.first_name)}` })),
        ...(co.data ?? []).map((r) => ({ type: "Company", label: r.name, href: `/dashboard/companies?q=${encodeURIComponent(r.name)}` })),
      ]);
    }, 250);
    return () => clearTimeout(t);
  }, [q, sb, workspaceId]);

  const unread = notifs.filter((n) => !n.read).length;
  const toggle = () => { const v = !collapsed; setCollapsed(v); try { localStorage.setItem("sb_collapsed", v ? "1" : "0"); } catch {} };

  async function switchWs(id: string) {
    await fetch("/api/workspace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId: id }) });
    router.refresh();
  }
  async function markAll() {
    await sb.from("sb_notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    setNotifs((n) => n.map((x) => ({ ...x, read: true })));
  }
  async function signOut() { await sb.auth.signOut(); router.replace("/login"); router.refresh(); }

  const sidebar = (
    <nav className="flex h-full flex-col bg-navy-deep text-slate-200" aria-label="Main">
      <div className="flex h-16 items-center px-4">{collapsed && !mobile ? <LogoMark dark size={28} /> : <Logo dark href="/dashboard" />}</div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {NAV.map(([label, href]) => {
          const active = href === "/dashboard" ? path === href : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} title={label} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-teal text-white" : "hover:bg-white/10"}`}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-lime" : "bg-slate-500"}`} />
                {(!collapsed || mobile) && label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className={`sticky top-0 hidden h-screen shrink-0 transition-all lg:block ${collapsed ? "w-[68px]" : "w-60"}`}>{sidebar}</aside>
      {mobile && (
        <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-navy-deep/60" onClick={() => setMobile(false)} /><div className="absolute left-0 top-0 h-full w-64">{sidebar}</div></div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4" ref={box}>
          <button className="btn-ghost lg:hidden" onClick={() => setMobile(true)} aria-label="Open navigation">Menu</button>
          <button className="btn-ghost hidden lg:inline-flex" onClick={toggle} aria-label="Collapse sidebar">{collapsed ? "Expand" : "Collapse"}</button>
          <div className="relative max-w-md flex-1">
            <input className="input" type="search" placeholder="Search leads, contacts, companies" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            {results && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                {results.length === 0 ? <p className="px-3 py-2 text-sm text-muted">No matches</p> : results.map((r, i) => (
                  <Link key={i} href={r.href} className="flex justify-between rounded-lg px-3 py-2 text-sm hover:bg-canvas"><span>{r.label}</span><span className="text-xs text-muted">{r.type}</span></Link>
                ))}
              </div>
            )}
          </div>
          <select className="input hidden w-44 sm:block" aria-label="Workspace" value={workspaceId} onChange={(e) => switchWs(e.target.value)}>
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <div className="relative">
            <button className="btn-ghost" onClick={() => setMenu(menu === "notif" ? "" : "notif")} aria-label="Notifications">Alerts{unread > 0 && <span className="ml-1.5 rounded-full bg-teal px-1.5 text-xs text-white">{unread}</span>}</button>
            {menu === "notif" && (
              <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><span className="text-sm font-semibold">Notifications</span>{unread > 0 && <button className="text-xs text-teal" onClick={markAll}>Mark all read</button>}</div>
                <div className="max-h-80 overflow-y-auto">
                  {notifs.length === 0 ? <p className="px-4 py-6 text-center text-sm text-muted">You are all caught up.</p> : notifs.map((n) => (
                    <div key={n.id} className={`border-b border-slate-50 px-4 py-3 text-sm ${n.read ? "" : "bg-mint/50"}`}><p className="font-medium">{n.title}</p>{n.body && <p className="text-muted">{n.body}</p>}<p className="mt-1 text-xs text-muted">{fdt(n.created_at)}</p></div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-bold text-white" onClick={() => setMenu(menu === "user" ? "" : "user")} aria-label="Account menu">{(email[0] || "U").toUpperCase()}</button>
            {menu === "user" && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                <p className="truncate px-3 py-2 text-xs text-muted">{email}</p>
                <Link href="/dashboard/settings" className="block rounded-lg px-3 py-2 text-sm hover:bg-canvas">Profile and settings</Link>
                <Link href="/dashboard/billing" className="block rounded-lg px-3 py-2 text-sm hover:bg-canvas">Billing</Link>
                <button className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-canvas" onClick={signOut}>Sign out</button>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
