import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { adminEmails } from "@/lib/context";
import { PLANS } from "@/lib/plans";
import { activateForEmail } from "@/lib/billing";

// Manual verification path: platform admins (ADMIN_EMAILS) approve a claim after checking the order in Selar.
export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!adminEmails().includes((user.email || "").toLowerCase())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ error: "Server is not configured" }, { status: 503 });
  const { claimId, decision } = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const { data: claim } = await admin.from("sb_payment_claims").select("*").eq("id", claimId).eq("status", "pending").maybeSingle();
  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  if (decision === "approve") {
    const plan = PLANS.find((p) => p.id === claim.plan);
    if (!plan || !claim.email || !(await activateForEmail(admin, claim.email, plan.id, plan.price, claim.order_ref, "manual_verification")))
      return NextResponse.json({ error: "Could not activate: account or plan missing" }, { status: 400 });
    await admin.from("sb_payment_claims").update({ status: "approved" }).eq("id", claim.id);
  } else await admin.from("sb_payment_claims").update({ status: "rejected" }).eq("id", claim.id);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !adminEmails().includes((user.email || "").toLowerCase())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!hasServiceRole()) return NextResponse.json({ claims: [] });
  const { data } = await createAdminClient().from("sb_payment_claims").select("*").eq("status", "pending").order("created_at");
  return NextResponse.json({ claims: data ?? [] });
}
