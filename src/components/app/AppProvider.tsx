"use client";
import { createContext, useContext, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Member = { id: string; name: string; email: string | null; role: string };
export type AppCtx = {
  workspaceId: string; workspaceName: string; userId: string; userEmail: string; role: string;
  canWrite: boolean; canManage: boolean; members: Member[]; prefs: Record<string, any>; scoring: Record<string, number>; // eslint-disable-line @typescript-eslint/no-explicit-any
  ingestKey: string; hasAccess: boolean; isAdmin: boolean; planLabel: string | null; sb: SupabaseClient;
};
const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ value, children }: { value: Omit<AppCtx, "sb">; children: React.ReactNode }) {
  const v = useMemo(() => ({ ...value, sb: createClient() }), [value]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}
