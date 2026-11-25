import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeFetch } from "@/lib/safeUrl";

export const TRIGGERS = ["lead_created", "signal_received", "score_threshold", "status_changed"] as const;
export type Cond = { field: string; op: "eq" | "neq" | "gte" | "lte" | "contains"; value: string };
export type Action = { type: "notify" | "assign_owner" | "create_task" | "update_status" | "slack" | "webhook"; params: Record<string, string> };

const check = (c: Cond, rec: Record<string, unknown>) => {
  const v = rec[c.field];
  switch (c.op) {
    case "eq": return String(v ?? "") === c.value;
    case "neq": return String(v ?? "") !== c.value;
    case "gte": return Number(v) >= Number(c.value);
    case "lte": return Number(v) <= Number(c.value);
    case "contains": return String(v ?? "").toLowerCase().includes(c.value.toLowerCase());
  }
};

/** Runs every active workflow in the workspace that matches the trigger. Pass a service role client. */
export async function runWorkflows(admin: SupabaseClient, workspaceId: string, trigger: string, record: Record<string, unknown>, table = "sb_leads") {
  const { data: flows } = await admin.from("sb_workflows").select("*").eq("workspace_id", workspaceId).eq("trigger", trigger).eq("status", "active");
  for (const wf of flows ?? []) {
    const log: string[] = [];
    let error: string | null = null;
    try {
      const conds = (wf.conditions ?? []) as Cond[];
      if (!conds.every((c) => check(c, record))) { log.push("Conditions not met, skipped"); await save(admin, wf, workspaceId, "skipped", log, null); continue; }
      for (const a of (wf.actions ?? []) as Action[]) {
        try { log.push(await exec(admin, workspaceId, a, record, table)); }
        catch (e) { const m = `${a.type} failed: ${e instanceof Error ? e.message : e}`; log.push(m); error = error ? `${error}; ${m}` : m; }
      }
    } catch (e) { error = e instanceof Error ? e.message : String(e); }
    await save(admin, wf, workspaceId, error ? "failed" : "success", log, error);
  }
}

async function save(admin: SupabaseClient, wf: { id: string }, workspaceId: string, status: string, log: string[], error: string | null) {
  await admin.from("sb_workflow_runs").insert({ workflow_id: wf.id, workspace_id: workspaceId, status, log, error });
}

async function exec(admin: SupabaseClient, ws: string, a: Action, rec: Record<string, unknown>, table: string) {
  const name = String(rec.name ?? rec.title ?? "record");
  const id = rec.id as string | undefined;
  const fill = (s: string) => (s || "").replace(/\{\{(\w+)\}\}/g, (_, k) => String(rec[k] ?? ""));
  switch (a.type) {
    case "notify": {
      let ids: string[] = [];
      if (a.params.user_id === "owner" && rec.owner_id) ids = [rec.owner_id as string];
      else if (a.params.user_id && a.params.user_id !== "all" && a.params.user_id !== "owner") ids = [a.params.user_id];
      else { const { data } = await admin.from("sb_workspace_members").select("user_id").eq("workspace_id", ws).in("role", ["owner", "admin"]); ids = (data ?? []).map((m) => m.user_id); }
      if (!ids.length) throw new Error("No recipients");
      await admin.from("sb_notifications").insert(ids.map((u) => ({ workspace_id: ws, user_id: u, title: fill(a.params.title || "Workflow alert"), body: fill(a.params.body || name), link: table === "sb_leads" ? "/dashboard/leads" : null })));
      return `Notified ${ids.length} user(s)`;
    }
    case "assign_owner": {
      let uid = a.params.user_id;
      if (!uid || uid === "round_robin") {
        const { data: mem } = await admin.from("sb_workspace_members").select("user_id").eq("workspace_id", ws).neq("role", "viewer").order("user_id");
        if (!mem?.length) throw new Error("No members to assign");
        const { count } = await admin.from(table).select("id", { count: "exact", head: true }).eq("workspace_id", ws);
        uid = mem[(count ?? 0) % mem.length].user_id;
      }
      await admin.from(table).update({ owner_id: uid }).eq("id", id!).eq("workspace_id", ws);
      return "Assigned owner";
    }
    case "create_task": {
      const days = Number(a.params.due_days || 1);
      await admin.from("sb_tasks").insert({ workspace_id: ws, title: fill(a.params.title || "Follow up: {{name}}"), kind: "task", due_at: new Date(Date.now() + days * 86400_000).toISOString(), entity_type: table === "sb_leads" ? "lead" : null, entity_id: id ?? null, assignee_id: (rec.owner_id as string) || null });
      return "Created task";
    }
    case "update_status": {
      if (!a.params.status) throw new Error("No status configured");
      await admin.from(table).update({ status: a.params.status }).eq("id", id!).eq("workspace_id", ws);
      return `Status set to ${a.params.status}`;
    }
    case "slack":
    case "webhook": {
      const provider = a.type === "slack" ? "slack" : "webhook_out";
      const { data: sec } = await admin.from("sb_integration_secrets").select("secret").eq("workspace_id", ws).eq("provider", provider).maybeSingle();
      if (!sec) throw new Error(`${provider === "slack" ? "Slack" : "Outbound webhook"} integration is not connected`);
      const body = a.type === "slack" ? { text: fill(a.params.message || "SalesBuzz AI: {{name}}") } : { event: "salesbuzz.workflow", record: rec };
      const r = await safeFetch(sec.secret, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(`Endpoint responded ${r.status}`);
      return `${a.type} delivered`;
    }
  }
}
