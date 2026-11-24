"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
      onClick={async () => { await createClient().auth.signOut(); router.replace("/login"); router.refresh(); }}
    >
      Sign out
    </button>
  );
}
