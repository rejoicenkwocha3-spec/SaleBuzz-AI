import { unstable_rethrow } from "next/navigation";
import Link from "next/link";
import { getContext } from "@/lib/context";
import { AppProvider } from "@/components/app/AppProvider";
import { Shell } from "@/components/app/Shell";
import { ToastProvider } from "@/components/app/ui";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let c: Awaited<ReturnType<typeof getContext>>;
  try { c = await getContext(); } catch (e) {
    unstable_rethrow(e);
    return (
      <main className="mx-auto max-w-xl px-5 py-16">
        <h1 className="text-2xl font-bold text-navy">Setup problem</h1>
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{e instanceof Error ? e.message : "Unknown error"}</p>
        <p className="mt-4 text-sm text-muted">Send this message to your developer. You can also check <Link className="text-teal underline" href="/api/health">/api/health</Link>.</p>
      </main>
    );
  }
  const plan = PLANS.find((p) => p.id === c.subscription?.plan);
  const value = {
    workspaceId: c.workspace.id, workspaceName: c.workspace.name, userId: c.user.id, userEmail: c.user.email ?? "",
    role: c.role, canWrite: c.canWrite, canManage: c.canManage, members: c.members,
    prefs: (c.workspace.preferences ?? {}) as Record<string, unknown>, scoring: (c.workspace.scoring ?? {}) as Record<string, number>,
    ingestKey: c.canManage ? c.workspace.ingest_key : "", hasAccess: c.hasAccess, isAdmin: c.isAdmin, planLabel: plan ? `${plan.label} ($${plan.price})` : null,
  };
  return (
    <ToastProvider>
      <AppProvider value={value}>
        <Shell workspaces={c.memberships} workspaceId={c.workspace.id} email={c.user.email ?? ""}>{children}</Shell>
      </AppProvider>
    </ToastProvider>
  );
}
