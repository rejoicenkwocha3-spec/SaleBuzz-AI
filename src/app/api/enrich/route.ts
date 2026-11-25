import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/api";
import { safeFetch } from "@/lib/safeUrl";

const clean = (s: string) => s.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

// Enrichment from the company's own public website (title and meta description). Source and date are recorded.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const c = await getApiContext(b.workspaceId);
  if ("error" in c) return c.error;
  if (!c.canWrite) return NextResponse.json({ error: "Read only access" }, { status: 403 });
  const { data: co } = await c.supabase.from("sb_companies").select("id, website").eq("id", b.companyId).eq("workspace_id", b.workspaceId).maybeSingle();
  if (!co?.website) return NextResponse.json({ error: "Add a website to this company first" }, { status: 400 });
  try {
    const url = /^https?:\/\//.test(co.website) ? co.website : `https://${co.website}`;
    const r = await safeFetch(url, { headers: { "user-agent": "SalesBuzzAI/1.0 (+company enrichment)" } });
    if (r.status >= 300 && r.status < 400) throw new Error("The site redirects; enter its final address");
    if (!r.ok) throw new Error(`Website responded ${r.status}`);
    const html = (await r.text()).slice(0, 300_000);
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
    const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1];
    const rows = [title && { field: "Website title", value: clean(title) }, desc && { field: "Website description", value: clean(desc) }].filter(Boolean) as { field: string; value: string }[];
    if (!rows.length) throw new Error("No public title or description found");
    for (const row of rows) {
      await c.supabase.from("sb_enrichments").delete().eq("entity_id", co.id).eq("field", row.field).eq("source", "Company website");
      await c.supabase.from("sb_enrichments").insert({ workspace_id: b.workspaceId, entity_type: "company", entity_id: co.id, ...row, source: "Company website", updated_by: c.user.id });
    }
    return NextResponse.json({ ok: true, added: rows.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Enrichment failed" }, { status: 400 });
  }
}
