import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreLead, type Prefs, type SignalLite } from "@/lib/scoring";

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.some((c) => c.trim())) rows.push(row); row = []; }
    else cur += ch;
  }
  row.push(cur); if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}
export function toCsv(rows: Record<string, unknown>[], cols: string[]) {
  // Prefix risky leading characters so spreadsheet apps do not execute cell contents as formulas.
  const esc = (v: unknown) => { let s = Array.isArray(v) ? v.join("; ") : v == null ? "" : String(v); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}
export function download(name: string, content: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export async function triggerWorkflow(workspaceId: string, trigger: string, entity: "lead" | "opportunity", id: string) {
  try { await fetch("/api/workflows/trigger", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId, trigger, entity, id }) }); } catch { /* workflow failures are logged server side */ }
}
export async function audit(sb: SupabaseClient, workspaceId: string, userId: string, action: string, entity: string, entityId?: string) {
  await sb.from("sb_audit_logs").insert({ workspace_id: workspaceId, user_id: userId, action, entity, entity_id: entityId ?? null });
}

/** Recalculates scores for the given leads (or all leads). Returns the number updated. */
export async function rescoreLeads(sb: SupabaseClient, ws: string, prefs: Prefs, weights: Record<string, number>, ids?: string[]) {
  let q = sb.from("sb_leads").select("id,industry,company_size,job_title,seniority,status,intent,source,score").eq("workspace_id", ws).limit(2000);
  if (ids) q = q.in("id", ids);
  const [{ data: leads }, { data: sigs }, { data: all }] = await Promise.all([
    q, sb.from("sb_signals").select("lead_id,type,strength,occurred_at").eq("workspace_id", ws).not("lead_id", "is", null).limit(10000),
    sb.from("sb_leads").select("source,status").eq("workspace_id", ws).limit(10000),
  ]);
  const overall = all?.length ? all.filter((l) => l.status === "converted").length / all.length : 0;
  const bySrc: Record<string, { n: number; w: number }> = {};
  (all ?? []).forEach((l) => { if (!l.source) return; const b = (bySrc[l.source] ??= { n: 0, w: 0 }); b.n++; if (l.status === "converted") b.w++; });
  let n = 0;
  for (const l of leads ?? []) {
    const s = (sigs ?? []).filter((x) => x.lead_id === l.id) as unknown as SignalLite[];
    const b = l.source ? bySrc[l.source] : undefined;
    const { score, reasons } = scoreLead(l, prefs, s, weights, b && b.n >= 5 ? b.w / b.n : undefined, overall);
    if (score !== l.score || ids) { await sb.from("sb_leads").update({ score, score_reason: reasons }).eq("id", l.id); n++; }
  }
  return n;
}
