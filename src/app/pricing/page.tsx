import Link from "next/link";
import { SiteLayout, Hero, CTA } from "@/components/site/SiteLayout";
import { PLANS } from "@/lib/plans";
export const metadata = { title: "Pricing | SalesBuzz AI" };

export default function Page() {
  return (
    <SiteLayout>
      <Hero eyebrow="Pricing" title="Choose the plan that fits your team" text="Three monthly subscriptions, billed securely through Selar. Prices are in US dollars." />
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((p, i) => (
            <div key={p.id} className={`flex flex-col rounded-2xl border bg-white p-7 ${i === 1 ? "border-teal shadow-lg" : "border-slate-200"}`}>
              <h2 className="text-lg font-bold text-navy">{p.label}</h2>
              <p className="mt-3 font-heading text-5xl font-extrabold text-navy">${p.price}</p>
              <p className="text-sm text-muted">per month</p>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-ink">{p.terms.map((t) => <li key={t} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald" />{t}</li>)}</ul>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-8 rounded-lg bg-navy px-4 py-3 text-center font-semibold text-white hover:bg-navy-deep">Subscribe for ${p.price} per month</a>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-2xl border border-slate-200 bg-canvas p-6 text-sm text-ink">
          <h3 className="font-bold text-navy">How activation works</h3>
          <p className="mt-2 text-muted">Create your account first and use the same email address at checkout. Clicking a checkout link or returning to this site does not unlock paid access. Your subscription activates only after the payment is confirmed by Selar and verified by SalesBuzz AI. You can check your status any time under Billing in your dashboard.</p>
          <p className="mt-3 text-muted">Prices and billing terms shown here are taken directly from the Selar checkout pages. Already have an account? <Link href="/login" className="font-semibold text-teal">Sign in</Link>.</p>
        </div>
      </section>
      <CTA title="Not ready to subscribe yet?" text="Create your account and explore your workspace. AI features unlock with an active plan." />
    </SiteLayout>
  );
}
