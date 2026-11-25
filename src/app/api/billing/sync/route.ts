import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { planByAmount } from "@/lib/plans";
import { activateForEmail } from "@/lib/billing";

// Re-checks verified payment events (received via the Selar webhook) that match the signed in, verified email.
export async function POST() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!user.email_confirmed_at) return NextResponse.json({ error: "Verify your email address first" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "Server is not configured" }, { status: 503 });
  const admin = createAdminClient();
  const { data: evs } = await admin.from("sb_payment_events").select("*").eq("email", user.email.toLowerCase()).in("status", ["unmatched", "verified"]).order("created_at", { ascending: false });
  for (const e of evs ?? []) {
    const plan = planByAmount(Number(e.amount));
    if (plan && (await activateForEmail(admin, user.email, plan.id, plan.price, e.event_id, "selar_webhook"))) {
      await admin.from("sb_payment_events").update({ status: "activated" }).eq("id", e.id);
      return NextResponse.json({ ok: true, activated: true });
    }
  }
  return NextResponse.json({ ok: true, activated: false });
}
