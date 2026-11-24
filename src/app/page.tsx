import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/login" className="hover:text-teal">Sign in</Link>
          <Link href="/signup" className="rounded-lg bg-navy px-4 py-2 text-white hover:bg-navy-deep">Sign up</Link>
        </nav>
      </header>
      <section className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-extrabold text-navy sm:text-5xl">Discover the right prospects. Understand buyer intent. Turn intelligence into revenue.</h1>
        <p className="mt-5 text-lg text-muted">SalesBuzz AI brings lead discovery, buying signals, and AI research into one place for your sales team.</p>
        <Link href="/signup" className="mt-8 rounded-lg bg-teal px-6 py-3 font-semibold text-white hover:opacity-90">Get started</Link>
      </section>
      <footer className="py-6 text-center text-sm text-muted">© 2026 SalesBuzz AI</footer>
    </main>
  );
}
