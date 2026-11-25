import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Activates (or extends) a subscription for the account with this email. Returns false if no account exists yet. */
export async function activateForEmail(admin: SupabaseClient, email: string, plan: string, amount: number, ref: string, source: string) {
  const { data: prof } = await admin.from("sb_profiles").select("id").eq("email", email.toLowerCase()).maybeSingle();
  if (!prof) return false;
  const end = new Date(Date.now() + 33 * 86400_000).toISOString(); // monthly period plus a small grace window
  const { data: ex } = await admin.from("sb_subscriptions").select("id").eq("user_id", prof.id).eq("status", "active").maybeSingle();
  if (ex) await admin.from("sb_subscriptions").update({ plan, amount, current_period_end: end, external_ref: ref }).eq("id", ex.id);
  else await admin.from("sb_subscriptions").insert({ user_id: prof.id, plan, amount, status: "active", source, external_ref: ref, current_period_end: end });
  return true;
}
