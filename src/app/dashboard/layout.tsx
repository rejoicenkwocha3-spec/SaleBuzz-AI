import { getContext } from "@/lib/context";
import { AppProvider } from "@/components/app/AppProvider";
import { Shell } from "@/components/app/Shell";
import { ToastProvider } from "@/components/app/ui";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const c = await getContext();
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
