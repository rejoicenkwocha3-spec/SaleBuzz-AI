import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Compact snapshot of the workspace. Fetched with the user's own RLS bound client, so it can never include another workspace. */
export async function workspaceSnapshot(sb: SupabaseClient, ws: string) {
  const [leads, opps, sigs, companies, tasks, counts] = await Promise.all([
    sb.from("sb_leads").select("name,email,company_name,job_title,industry,status,intent,score,source").eq("workspace_id", ws).order("score", { ascending: false }).limit(40),
    sb.from("sb_opportunities").select("name,stage,value,close_date").eq("workspace_id", ws).order("value", { ascending: false }).limit(25),
    sb.from("sb_signals").select("type,title,strength,source,occurred_at,lead_id").eq("workspace_id", ws).order("occurred_at", { ascending: false }).limit(30),
    sb.from("sb_companies").select("name,industry,size,location,is_account").eq("workspace_id", ws).limit(30),
    sb.from("sb_tasks").select("title,due_at,status").eq("workspace_id", ws).eq("status", "open").order("due_at").limit(15),
    Promise.all(["sb_leads", "sb_contacts", "sb_companies", "sb_opportunities", "sb_signals"].map((t) => sb.from(t).select("id", { count: "exact", head: true }).eq("workspace_id", ws))),
  ]);
  return JSON.stringify({
    totals: { leads: counts[0].count, contacts: counts[1].count, companies: counts[2].count, opportunities: counts[3].count, signals: counts[4].count },
    top_leads_by_score: leads.data, top_opportunities: opps.data, recent_signals: sigs.data, companies: companies.data, open_tasks: tasks.data,
  }).slice(0, 24000);
}
