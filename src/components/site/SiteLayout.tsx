import Link from "next/link";
import { Logo } from "@/components/Logo";

const NAV = [["Platform", "/platform"], ["Solutions", "/solutions"], ["Features", "/features"], ["Pricing", "/pricing"], ["About", "/about"], ["Contact", "/contact"]];

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-ink lg:flex">
            {NAV.map(([l, h]) => <Link key={h} href={h} className="hover:text-teal">{l}</Link>)}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/login" className="text-sm font-medium hover:text-teal">Sign in</Link>
            <Link href="/signup" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep">Sign up</Link>
          </div>
          <details className="relative lg:hidden">
            <summary className="cursor-pointer list-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium">Menu</summary>
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              {NAV.map(([l, h]) => <Link key={h} href={h} className="block rounded-lg px-3 py-2 text-sm hover:bg-canvas">{l}</Link>)}
              <hr className="my-2" />
              <Link href="/login" className="block rounded-lg px-3 py-2 text-sm hover:bg-canvas">Sign in</Link>
              <Link href="/signup" className="block rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white">Sign up</Link>
            </div>
          </details>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-100 py-6 text-center text-sm text-muted">© 2026 SalesBuzz AI</footer>
    </div>
  );
}

export function Hero({ eyebrow, title, text, children }: { eyebrow?: string; title: string; text: string; children?: React.ReactNode }) {
  return (
    <section className="bg-gradient-to-b from-mint/60 to-white">
      <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:py-24">
        {eyebrow && <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-teal">{eyebrow}</p>}
        <h1 className="text-4xl font-extrabold leading-tight text-navy sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">{text}</p>
        {children}
      </div>
    </section>
  );
}

export function Section({ title, text, children, tint }: { title?: string; text?: string; children: React.ReactNode; tint?: boolean }) {
  return (
    <section className={tint ? "bg-canvas" : "bg-white"}>
      <div className="mx-auto max-w-6xl px-5 py-16">
        {title && <h2 className="max-w-2xl text-3xl font-bold text-navy">{title}</h2>}
        {text && <p className="mt-3 max-w-2xl text-muted">{text}</p>}
        <div className={title ? "mt-10" : ""}>{children}</div>
      </div>
    </section>
  );
}

export function Cards({ items, cols = 3 }: { items: { title: string; text: string; href?: string }[]; cols?: 2 | 3 | 4 }) {
  const grid = cols === 4 ? "lg:grid-cols-4" : cols === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3";
  return (
    <div className={`grid gap-5 sm:grid-cols-2 ${grid}`}>
      {items.map((i) => {
        const body = (<><div className="mb-3 h-1.5 w-10 rounded-full bg-gradient-to-r from-teal to-lime" /><h3 className="text-lg font-bold text-navy">{i.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{i.text}</p>{i.href && <span className="mt-4 inline-block text-sm font-semibold text-teal">Learn more</span>}</>);
        return i.href ? <Link key={i.title} href={i.href} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-teal hover:shadow-md">{body}</Link>
          : <div key={i.title} className="rounded-2xl border border-slate-200 bg-white p-6">{body}</div>;
      })}
    </div>
  );
}

export function CTA({ title = "Turn sales intelligence into revenue", text = "Create your workspace and bring your prospects, signals, and research into one place." }) {
  return (
    <section className="bg-navy-deep">
      <div className="mx-auto max-w-4xl px-5 py-16 text-center">
        <h2 className="text-3xl font-bold text-white">{title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-300">{text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="rounded-lg bg-lime px-6 py-3 font-semibold text-navy-deep hover:opacity-90">Create account</Link>
          <Link href="/pricing" className="rounded-lg border border-white/30 px-6 py-3 font-semibold text-white hover:bg-white/10">View pricing</Link>
        </div>
      </div>
    </section>
  );
}

export function DashboardMockup() {
  const bars = [38, 52, 44, 68, 60, 82, 74, 95];
  return (
    <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xl" aria-label="Illustrative product preview">
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-canvas px-4 py-3"><i className="h-2.5 w-2.5 rounded-full bg-slate-300" /><i className="h-2.5 w-2.5 rounded-full bg-slate-300" /><i className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="ml-3 text-xs text-muted">Illustrative preview with sample figures</span></div>
      <div className="grid gap-4 p-5 sm:grid-cols-4">
        {[["High intent accounts", "24"], ["Qualified prospects", "118"], ["Pipeline value", "$412K"], ["Conversion rate", "17%"]].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-slate-100 p-4"><p className="text-xs text-muted">{k}</p><p className="mt-1 font-heading text-2xl font-bold text-navy">{v}</p></div>
        ))}
        <div className="rounded-xl border border-slate-100 p-4 sm:col-span-3">
          <p className="mb-3 text-xs text-muted">Pipeline growth</p>
          <div className="flex h-28 items-end gap-2">{bars.map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-teal to-emerald" style={{ height: `${h}%` }} />)}</div>
        </div>
        <div className="rounded-xl border border-slate-100 p-4"><p className="mb-2 text-xs text-muted">Recent signals</p>
          {["Pricing page visit", "Trial signup", "Hiring: sales"].map((s) => <p key={s} className="border-t border-slate-100 py-1.5 text-xs text-ink">{s}</p>)}</div>
      </div>
    </div>
  );
}
