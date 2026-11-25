// Values pasted into hosting dashboards often carry stray spaces, line breaks, or quotes. Clean them.
const clean = (v: string | undefined) => (v ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
export const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, "");
export const SUPABASE_ANON_KEY = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const SUPABASE_SERVICE_KEY = () => clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
