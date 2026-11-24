import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 font-heading text-xl font-extrabold text-navy">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M24 8c-3-3-10-3-12 1s2 6 8 7 7 5 3 8-10 3-13 0" fill="none" stroke="#0D9488" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="25" cy="7" r="3" fill="#84CC16" />
        <circle cx="7" cy="25" r="3" fill="#10B981" />
      </svg>
      SalesBuzz AI
    </Link>
  );
}
