import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("workspace_members").select("role, workspaces(name)").eq("user_id", user.id),
  ]);
  const ws = (memberships?.[0]?.workspaces as unknown as { name: string } | null)?.name;

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <Logo />
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted sm:inline">{user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-bold text-navy">Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
        <p className="mt-2 text-muted">{ws ? `Workspace: ${ws}` : "Your workspace is being prepared."}</p>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Account is active</h2>
          <p className="mt-1 text-sm text-muted">You are signed in. Leads, signals, and AI tools will appear here as modules are built.</p>
        </div>
      </main>
    </div>
  );
}
