"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

// ---------- Toasts ----------
type Toast = { id: number; kind: "success" | "error"; text: string };
const ToastCtx = createContext<(kind: Toast["kind"], text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l, { id, kind, text }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role={t.kind === "error" ? "alert" : "status"}
            className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${t.kind === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald/30 bg-mint text-navy"}`}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Modal ----------
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-deep/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-navy">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-muted hover:bg-canvas">Close</button></div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ title, text, confirmLabel = "Delete", onConfirm, onCancel }: { title: string; text: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-muted">{text}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

// ---------- Small pieces ----------
export function PageHeader({ title, text, actions }: { title: string; text?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-navy">{title}</h1>{text && <p className="mt-1 text-sm text-muted">{text}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
export const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) =>
  <div className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>{children}</div>;

export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gradient-to-r from-teal to-lime" />
      <h3 className="text-lg font-bold text-navy">{title}</h3><p className="mx-auto mt-1 max-w-md text-sm text-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export const Skeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-2" aria-busy="true">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}</div>
);
export function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "amber" | "red" | "teal" }) {
  const t = { slate: "bg-slate-100 text-slate-700", green: "bg-emerald/15 text-emerald-800", amber: "bg-amber-100 text-amber-800", red: "bg-red-100 text-red-700", teal: "bg-teal/15 text-teal" }[tone];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${t}`}>{children}</span>;
}
export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return <Card><p className="text-xs font-medium text-muted">{label}</p><p className="mt-1 font-heading text-3xl font-bold text-navy">{value}</p>{hint && <p className="mt-1 text-xs text-muted">{hint}</p>}</Card>;
}
export function Bars({ data, color = "#0D9488", format }: { data: { label: string; value: number }[]; color?: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="text-sm text-muted">No data in this period.</p>;
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-muted" title={d.label}>{d.label}</span>
          <div className="h-3 flex-1 rounded-full bg-slate-100"><div className="h-3 rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} /></div>
          <span className="w-16 text-right font-medium text-ink">{format ? format(d.value) : d.value}</span>
        </div>
      ))}
    </div>
  );
}
export const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
export const fdate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "");
export const fdt = (d?: string | null) => (d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
