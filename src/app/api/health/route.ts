import { NextResponse } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/env";

// Setup diagnostics. Never returns secrets: only presence, length, key type, and a live check result.
export const dynamic = "force-dynamic";

function jwtInfo(k: string) {
  try {
    const p = JSON.parse(Buffer.from(k.split(".")[1], "base64url").toString());
    return { role: p.role as string, ref: p.ref as string };
  } catch { return null; }
}

export async function GET() {
  const urlRef = SUPABASE_URL.match(/^https:\/\/([a-z0-9]+)\.supabase\.co$/)?.[1] ?? null;
  const info = jwtInfo(SUPABASE_ANON_KEY);
  const keyType = !SUPABASE_ANON_KEY ? "missing" : SUPABASE_ANON_KEY.startsWith("sb_publishable_") ? "publishable" : SUPABASE_ANON_KEY.startsWith("sb_secret_") ? "SECRET (wrong key)" : info ? `jwt:${info.role}` : "unrecognized format";
  let live: string = "not tested";
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } });
      live = r.ok ? "OK: Supabase accepted the key" : `Supabase rejected the key (HTTP ${r.status})`;
    } catch { live = "Could not reach Supabase at that URL"; }
  }
  const problems: string[] = [];
  if (!SUPABASE_URL) problems.push("NEXT_PUBLIC_SUPABASE_URL is missing");
  else if (!urlRef) problems.push("NEXT_PUBLIC_SUPABASE_URL should look like https://PROJECTREF.supabase.co");
  if (!SUPABASE_ANON_KEY) problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");
  if (keyType.startsWith("jwt:") && keyType !== "jwt:anon") problems.push(`The key is a ${info?.role} key. Use the anon (public) key instead`);
  if (keyType.startsWith("SECRET")) problems.push("This is a secret key. Use the publishable or anon key");
  if (info?.ref && urlRef && info.ref !== urlRef) problems.push(`The key belongs to project ${info.ref} but the URL is project ${urlRef}`);
  return NextResponse.json({
    url: SUPABASE_URL ? { host: SUPABASE_URL.replace("https://", ""), projectRef: urlRef } : "missing",
    anonKey: { present: !!SUPABASE_ANON_KEY, length: SUPABASE_ANON_KEY.length, type: keyType, projectRefInKey: info?.ref ?? null },
    serviceRoleKeyPresent: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    aiKeyPresent: !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY),
    selarSecretPresent: !!process.env.SELAR_WEBHOOK_SECRET,
    liveCheck: live,
    problems: problems.length ? problems : live.startsWith("OK") ? ["None found"] : ["Key and URL look well formed but Supabase still rejects them. Re copy the key from the project this URL belongs to"],
  });
}
