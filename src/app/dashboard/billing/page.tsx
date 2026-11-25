"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app/AppProvider";
import { Badge, Card, PageHeader, fdate, useToast } from "@/components/app/ui";
import { PLANS } from "@/lib/plans";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function BillingPage() {
  const { sb, userId, userEmail, hasAccess, isAdmin, planLabel } = useApp();
  const toast = useToast(); const router = useRouter();
  const [sub, setSub] = useState<Row | null>(null); const [claims, setClaims] = useState<Row[]>([]); const [mine, setMine] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false); const [ref, setRef] = useState(""); const [plan, setPlan] = useState(PLANS[0].id);

  const load = useCallback(async () => {
    const [s, m] = await Promise.all([sb.from("sb_subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1), sb.from("sb_payment_claims").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5)]);
    setSub(s.data?.[0] ?? null); setMine(m.data ?? []);
    if (isAdmin) { const r = await fetch("/api/billing/claims"); if (r.ok) setClaims((await r.json()).claims); }
  }, [sb, userId, isAdmin]);
  useEffect(() => { load(); }, [load]);

  async function check() {
    setBusy(true); const r = await fetch("/api/billing/sync", { method: "POST" }); const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) return toast("error", j.error || "Could not check payment");
    if (j.activated) { toast("success", "Subscription activated"); router.refresh(); load(); } else toast("error", "No verified payment found for your email yet. Payments can take a few minutes to arrive.");
  }
  async function claim(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await sb.from("sb_payment_claims").insert({ user_id: userId, email: userEmail.toLowerCase(), plan, order_ref: ref.trim(), status: "pending" });
    if (error) return toast("error", error.message);
    toast("success", "Submitted for verification"); setRef(""); load();
  }
  async function decide(id: string, decision: string) {
    const r = await fetch("/api/billing/claims", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ claimId: id, decision }) }); const j = await r.json().catch(() => ({}));
    if (!r.ok) return toast("error", j.error); toast("success", decision === "approve" ? "Subscription activated" : "Claim rejected"); load();
  }

  return (
    <div>
      <PageHeader title="Billing" text="Subscriptions are billed monthly through Selar." />
      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs text-muted">Current status</p><p className="mt-1 flex items-center gap-2 font-heading text-xl font-bold text-navy">{hasAccess ? (planLabel ?? "Administrator access") : "No active subscription"} <Badge tone={hasAccess ? "green" : "slate"}>{hasAccess ? "Active" : "Inactive"}</Badge></p>
            {sub?.current_period_end && <p className="mt-1 text-sm text-muted">Verified through {fdate(sub.current_period_end)}. It renews when Selar confirms the next monthly payment.</p>}
            {sub?.status === "canceled" && <p className="mt-1 text-sm text-muted">Canceled. Subscribe again to restore access.</p>}</div>
          <button className="btn-ghost" onClick={check} disabled={busy}>{busy ? "Checking..." : "Check payment status"}</button>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">{PLANS.map((p) => (
        <Card key={p.id}><p className="font-semibold text-navy">{p.label}</p><p className="mt-1 font-heading text-3xl font-extrabold text-navy">${p.price}<span className="text-sm font-medium text-muted"> per month</span></p>
          <ul className="mt-3 space-y-1 text-xs text-muted">{p.terms.map((t) => <li key={t}>{t}</li>)}</ul>
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn-sm mt-4 w-full">{sub?.status === "active" && sub.plan === p.id ? "Current plan" : `Subscribe for $${p.price}`}</a></Card>))}</div>
      <Card className="mt-6 text-sm"><h2 className="font-bold text-navy">How activation works</h2>
        <p className="mt-2 text-muted">Check out with <strong>{userEmail}</strong>, the email on this account. Access turns on only after Selar confirms the payment to SalesBuzz AI. Opening the checkout page does not grant access. Press Check payment status a few minutes after paying. To cancel, use the link in your Selar receipt emails.</p>
        <form onSubmit={claim} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><select className="input" value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Plan">{PLANS.map((p) => <option key={p.id} value={p.id}>{p.label} ($${p.price})</option>)}</select><input className="input" placeholder="Selar order reference" required value={ref} onChange={(e) => setRef(e.target.value)} aria-label="Order reference" /><button className="btn-ghost">Request manual verification</button></form>
        <p className="mt-2 text-xs text-muted">If automatic confirmation does not arrive, submit your Selar order reference. An administrator checks it against Selar before activating.</p>
        {mine.length > 0 && <ul className="mt-3 space-y-1 text-xs text-muted">{mine.map((c) => <li key={c.id}>Order {c.order_ref}: {c.status}</li>)}</ul>}
      </Card>
      {isAdmin && <Card className="mt-6"><h2 className="font-bold text-navy">Pending manual verifications (administrator)</h2>
        {claims.length === 0 ? <p className="mt-2 text-sm text-muted">None pending.</p> : <ul className="mt-3 space-y-2">{claims.map((c) => <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 p-3 text-sm"><span>{c.email}: {PLANS.find((p) => p.id === c.plan)?.label}, order {c.order_ref}</span><span className="flex gap-3"><button className="text-teal" onClick={() => decide(c.id, "approve")}>Verified, activate</button><button className="text-red-600" onClick={() => decide(c.id, "reject")}>Reject</button></span></li>)}</ul>}
        <p className="mt-3 text-xs text-muted">Only approve after you see the matching paid order in your Selar dashboard.</p></Card>}
    </div>
  );
}
