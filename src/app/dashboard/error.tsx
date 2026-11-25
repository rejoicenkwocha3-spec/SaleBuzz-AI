"use client";
import { useEffect } from "react";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-6">
      <h2 className="text-lg font-bold text-navy">This page hit an error</h2>
      <p className="mt-2 text-sm text-red-700">{error.message || "Unknown error"}</p>
      {error.digest && <p className="mt-1 text-xs text-muted">Reference: {error.digest}</p>}
      <button className="btn-sm mt-4" onClick={reset}>Try again</button>
    </div>
  );
}
