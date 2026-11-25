import { NextResponse } from "next/server";
import { aiGuard } from "@/lib/ai/guard";
import { generateJson } from "@/lib/ai/provider";
import { safeFetch } from "@/lib/safeUrl";

const SECTIONS = ["overview", "products_and_services", "industry", "target_customers", "recent_developments", "potential_challenges", "buying_opportunities", "decision_makers", "suggested_approach", "next_steps"];

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const g = await aiGuard(b.workspaceId);
  if ("error" in g) return g.error;
  const sb = g.supabase, ws = b.workspaceId as string;

  let company: Record<string, unknown> | null = null;
  if (b.companyId) {
    const { data } = await sb.from("sb_companies").select("*").eq("id", b.companyId).eq("workspace_id", ws).maybeSingle();
    company = data;
  }
  const name = String(company?.name || b.companyName || "").trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: "Enter a company name or pick an existing company" }, { status: 400 });

  // Gather grounding data: workspace records, enrichment records, and the company's own website if known.
  const sources: { label: string; detail: string }[] = [];
  const grounding: Record<string, unknown> = { company_record: company };
  if (company) {
    sources.push({ label: "Workspace company record", detail: "Your CRM data" });
    const [{ data: contacts }, { data: signals }, { data: opps }, { data: enr }, { data: notes }] = await Promise.all([
      sb.from("sb_contacts").select("first_name,last_name,job_title,department,seniority").eq("company_id", company.id as string).limit(15),
      sb.from("sb_signals").select("type,title,strength,source,occurred_at").eq("company_id", company.id as string).order("occurred_at", { ascending: false }).limit(15),
      sb.from("sb_opportunities").select("name,stage,value").eq("company_id", company.id as string).limit(10),
      sb.from("sb_enrichments").select("field,value,source,updated_at").eq("entity_id", company.id as string).limit(20),
      sb.from("sb_activities").select("kind,body,created_at").eq("entity_id", company.id as string).order("created_at", { ascending: false }).limit(10),
    ]);
    Object.assign(grounding, { contacts, signals, opportunities: opps, enrichment: enr, notes });
    if (contacts?.length) sources.push({ label: "Connected contacts", detail: `${contacts.length} records` });
    if (signals?.length) sources.push({ label: "Buying signals", detail: `${signals.length} received signals` });
    if (enr?.length) sources.push({ label: "Enrichment records", detail: (enr as { source: string }[]).map((e) => e.source).filter((v, i, a) => a.indexOf(v) === i).join(", ") });
    if (company.website) {
      try {
        const url = /^https?:\/\//.test(String(company.website)) ? String(company.website) : `https://${company.website}`;
        const r = await safeFetch(url, { headers: { "user-agent": "SalesBuzzAI/1.0" } });
        if (r.ok) {
          const html = (await r.text()).slice(0, 200_000);
          const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 3500);
          grounding.website_text = text;
          sources.push({ label: "Company website", detail: String(company.website) });
        }
      } catch { /* website unavailable: report generated without it */ }
    }
  }
  if (b.notes) { grounding.user_notes = String(b.notes).slice(0, 2000); sources.push({ label: "Notes you provided", detail: "Entered for this report" }); }

  try {
    const { data, res } = await generateJson<Record<string, string>>({
      system: `You write account research reports for sales teams. You have NO web access. Use ONLY the grounding data given. For any section the data cannot support, write exactly "Not available from connected data." Never invent facts, news, people, revenue or customers. Where you infer something, prefix it with "Inference:". Keys: ${SECTIONS.join(", ")}. Each value is a short plain text paragraph or lines separated by newlines.`,
      prompt: `Company: ${name}\n\nGROUNDING DATA:\n${JSON.stringify(grounding).slice(0, 14000)}`,
    });
    const content: Record<string, string> = {};
    for (const k of SECTIONS) content[k] = typeof data[k] === "string" ? data[k] : "Not available from connected data.";
    const { data: row, error } = await sb.from("sb_ai_reports").insert({ workspace_id: ws, company_id: company?.id ?? null, company_name: name, content, sources, model: res.model, created_by: g.user.id }).select().single();
    if (error) throw new Error(error.message);
    await sb.from("sb_ai_usage").insert({ workspace_id: ws, user_id: g.user.id, feature: "research", model: res.model, input_tokens: res.inputTokens, output_tokens: res.outputTokens });
    return NextResponse.json({ report: row });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Research failed" }, { status: 502 });
  }
}
