import { NextResponse } from "next/server";
import { aiGuard } from "@/lib/ai/guard";
import { generate } from "@/lib/ai/provider";
import { workspaceSnapshot } from "@/lib/ai/context";

const SYSTEM = `You are the SalesBuzz AI sales assistant for one company workspace.
Rules:
1. Use ONLY the workspace data provided below plus what the user tells you. Never invent leads, numbers, signals, companies or quotes.
2. If the data needed is missing, say exactly what is missing and what the user could connect or add.
3. You cannot browse the web. Do not claim to have researched anything externally.
4. When drafting emails, personalize only with facts present in the data and keep them concise.
5. Cite the record names you rely on.`;

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const g = await aiGuard(b.workspaceId);
  if ("error" in g) return g.error;
  const message = String(b.message || "").trim().slice(0, 4000);
  if (!message) return NextResponse.json({ error: "Enter a message" }, { status: 400 });

  let convId = b.conversationId as string | undefined;
  if (convId) {
    const { data } = await g.supabase.from("sb_ai_conversations").select("id").eq("id", convId).eq("user_id", g.user.id).maybeSingle();
    if (!data) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  } else {
    const { data, error } = await g.supabase.from("sb_ai_conversations").insert({ workspace_id: b.workspaceId, user_id: g.user.id, title: message.slice(0, 60) }).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    convId = data.id;
  }
  const { data: hist } = await g.supabase.from("sb_ai_messages").select("role, content").eq("conversation_id", convId!).order("created_at").limit(20);
  await g.supabase.from("sb_ai_messages").insert({ workspace_id: b.workspaceId, conversation_id: convId, role: "user", content: message });
  try {
    const snap = await workspaceSnapshot(g.supabase, b.workspaceId);
    const res = await generate({ system: `${SYSTEM}\n\nWORKSPACE DATA (JSON):\n${snap}`, messages: [...(hist ?? []) as { role: "user" | "assistant"; content: string }[], { role: "user", content: message }] });
    await g.supabase.from("sb_ai_messages").insert({ workspace_id: b.workspaceId, conversation_id: convId, role: "assistant", content: res.text });
    await g.supabase.from("sb_ai_usage").insert({ workspace_id: b.workspaceId, user_id: g.user.id, feature: "assistant", model: res.model, input_tokens: res.inputTokens, output_tokens: res.outputTokens });
    return NextResponse.json({ conversationId: convId, reply: res.text });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI request failed", conversationId: convId }, { status: 502 });
  }
}
