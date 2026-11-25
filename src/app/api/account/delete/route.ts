import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

// Permanently deletes the signed in user. Workspaces they own (and all their data) are removed by cascade.
export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { confirm } = await req.json().catch(() => ({}));
  if (confirm !== user.email) return NextResponse.json({ error: "Type your email address to confirm" }, { status: 400 });
  if (!hasServiceRole()) return NextResponse.json({ error: "Server is not configured for account deletion" }, { status: 503 });
  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await sb.auth.signOut();
  return NextResponse.json({ ok: true });
}
