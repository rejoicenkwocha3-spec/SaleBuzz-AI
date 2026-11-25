import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from "./env";

/** Service role client. SERVER ONLY. Never import from a client component. */
export function createAdminClient() {
  const url = SUPABASE_URL;
  const key = SUPABASE_SERVICE_KEY();
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export const hasServiceRole = () => !!SUPABASE_SERVICE_KEY();
