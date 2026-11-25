import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { planByAmount } from "@/lib/plans";
import { activateForEmail } from "@/lib/billing";

const safeEq = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const pick = (o: unknown, ...paths: string[]): unknown => {
  for (const p of paths) {
    let v: unknown = o;
    for (const k of p.split(".")) v = v == null || typeof v !== "object" ? undefined : (v as Record<string, unknown>)[k];
    if (v != null && v !== "") return v;
  }
};

/**
 * Selar payment notification receiver.
 * Configure in Selar: webhook URL = https://YOUR_DOMAIN/api/selar/webhook?secret=YOUR_SELAR_WEBHOOK_SECRET
 * Nothing is activated unless the shared secret matches. The payload field names below are read
 * defensively because they are not verified against a live Selar notification: check the first real
 * event in the sb_payment_events table and adjust this mapping if needed.
 */
export async function POST(req: Request) {
  const secret = process.env.SELAR_WEBHOOK_SECRET;
  if (!secret || !hasServiceRole()) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const given = new URL(req.url).searchParams.get("secret") || req.headers.get("x-selar-secret") || "";
  if (!safeEq(given, secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const email = String(pick(body, "email", "customer.email", "data.customer.email", "data.email", "buyer.email") || "").toLowerCase();
  const amount = Number(pick(body, "amount", "data.amount", "price", "data.price", "total") || 0);
  const currency = String(pick(body, "currency", "data.currency") || "USD").toUpperCase();
  const evName = String(pick(body, "event", "type", "data.status", "status") || "").toLowerCase();
  const orderId = String(pick(body, "order_id", "data.order_id", "reference", "data.reference", "id", "data.id") ||
    crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 32));

  const admin = createAdminClient();
  const { error: dup } = await admin.from("sb_payment_events").insert({ event_id: orderId, email, amount, currency, payload: body, status: "received" });
  if (dup) return NextResponse.json({ ok: true, duplicate: true }); // idempotent
  if (/cancel|refund|fail|declin/.test(evName)) {
    await admin.from("sb_payment_events").update({ status: "ignored" }).eq("event_id", orderId);
    if (/cancel|refund/.test(evName) && email) await admin.from("sb_subscriptions").update({ status: "canceled" }).eq("status", "active").in("user_id", (await admin.from("sb_profiles").select("id").eq("email", email)).data?.map((p) => p.id) ?? []);
    return NextResponse.json({ ok: true });
  }
  const plan = planByAmount(amount);
  if (!email || !plan || currency !== "USD") {
    await admin.from("sb_payment_events").update({ status: "unmatched" }).eq("event_id", orderId);
    return NextResponse.json({ ok: true, matched: false });
  }
  const activated = await activateForEmail(admin, email, plan.id, plan.price, orderId, "selar_webhook");
  await admin.from("sb_payment_events").update({ status: activated ? "activated" : "verified" }).eq("event_id", orderId);
  return NextResponse.json({ ok: true, activated });
}
