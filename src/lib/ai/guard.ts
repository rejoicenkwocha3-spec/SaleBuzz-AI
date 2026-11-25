import "server-only";
import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/api";
import { aiConfigured } from "./provider";
import { rateLimit } from "@/lib/rateLimit";

/** Common checks for every AI endpoint: auth, workspace, subscription, config, rate and daily limits. */
export async function aiGuard(workspaceId: string) {
  const c = await getApiContext(workspaceId);
  if ("error" in c) return c;
  if (!c.hasAccess) return { error: NextResponse.json({ error: "An active subscription is required for AI features. Open Billing to subscribe." }, { status: 402 }) };
  if (!aiConfigured()) return { error: NextResponse.json({ error: "AI is not configured. Add ANTHROPIC_API_KEY (or OPENAI_API_KEY) on the server." }, { status: 503 }) };
  if (!rateLimit(`ai:${c.user.id}`, 20, 60_000)) return { error: NextResponse.json({ error: "Too many requests. Wait a minute and retry." }, { status: 429 }) };
  const since = new Date(Date.now() - 86400_000).toISOString();
  const { count } = await c.supabase.from("sb_ai_usage").select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId).gte("created_at", since);
  const limit = Number(process.env.AI_DAILY_LIMIT || 300);
  if ((count ?? 0) >= limit) return { error: NextResponse.json({ error: `Daily AI limit of ${limit} requests reached.` }, { status: 429 }) };
  return c;
}
