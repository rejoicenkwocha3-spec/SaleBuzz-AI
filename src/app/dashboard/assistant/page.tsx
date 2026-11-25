"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/app/AppProvider";
import { Card, PageHeader, fdt, useToast } from "@/components/app/ui";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const PROMPTS = ["Which prospects should I contact today and why?", "Summarize my pipeline and flag risks", "Explain the most recent buying signals", "Draft a personalized outreach email for my top scored lead", "Suggest discovery questions for my largest open opportunity", "Write a follow up message for a lead I contacted but who has not replied"];

export default function AssistantPage() {
  const { sb, workspaceId, userId, canWrite, hasAccess } = useApp();
  const toast = useToast();
  const [convs, setConvs] = useState<Row[]>([]); const [convId, setConvId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Row[]>([]); const [input, setInput] = useState(""); const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(async () => { const { data } = await sb.from("sb_ai_conversations").select("*").eq("workspace_id", workspaceId).eq("user_id", userId).order("created_at", { ascending: false }).limit(30); setConvs(data ?? []); }, [sb, workspaceId, userId]);
  useEffect(() => { loadConvs(); }, [loadConvs]);
  useEffect(() => { if (!convId) { setMsgs([]); return; } sb.from("sb_ai_messages").select("*").eq("conversation_id", convId).order("created_at").then(({ data }) => setMsgs(data ?? [])); }, [sb, convId]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true); setInput(""); setMsgs((m) => [...m, { id: "tmp", role: "user", content: text }]);
    const res = await fetch("/api/ai/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId, conversationId: convId, message: text }) });
    const j = await res.json().catch(() => ({ error: "Request failed" })); setBusy(false);
    if (j.conversationId && !convId) { setConvId(j.conversationId); loadConvs(); }
    if (!res.ok) { toast("error", j.error); setMsgs((m) => m.filter((x) => x.id !== "tmp")); setInput(text); return; }
    setMsgs((m) => [...m, { id: Math.random(), role: "assistant", content: j.reply }]);
  }

  return (
    <div>
      <PageHeader title="AI Assistant" text="Ask about your pipeline, research prospects, and draft outreach. It only uses data in this workspace." actions={<button className="btn-ghost" onClick={() => setConvId(null)}>New conversation</button>} />
      {!hasAccess && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">An active plan is required to use the assistant. <Link href="/dashboard/billing" className="font-semibold underline">Open Billing</Link></div>}
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="hidden max-h-[60vh] overflow-y-auto p-3 lg:block"><p className="px-2 pb-2 text-xs font-semibold uppercase text-muted">History</p>
          {convs.length === 0 ? <p className="px-2 text-sm text-muted">No conversations yet.</p> : convs.map((c) => <button key={c.id} onClick={() => setConvId(c.id)} className={`block w-full rounded-lg px-2 py-2 text-left text-sm ${convId === c.id ? "bg-mint" : "hover:bg-canvas"}`}><span className="line-clamp-1">{c.title}</span><span className="text-xs text-muted">{fdt(c.created_at)}</span></button>)}</Card>
        <Card className="flex min-h-[60vh] flex-col p-0">
          <div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
            {msgs.length === 0 && <div><p className="mb-3 text-sm text-muted">Try one of these:</p><div className="flex flex-wrap gap-2">{PROMPTS.map((p) => <button key={p} disabled={!canWrite} onClick={() => send(p)} className="rounded-full border border-slate-200 px-3 py-1.5 text-left text-sm hover:border-teal">{p}</button>)}</div></div>}
            {msgs.map((m) => <div key={m.id} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-2xl bg-navy px-4 py-2.5 text-sm text-white" : "max-w-[90%] whitespace-pre-wrap rounded-2xl bg-canvas px-4 py-2.5 text-sm"}>{m.content}</div>)}
            {busy && <div className="max-w-[90%] animate-pulse rounded-2xl bg-canvas px-4 py-2.5 text-sm text-muted">Thinking...</div>}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t border-slate-100 p-3">
            <input className="input" placeholder="Ask about your sales data" aria-label="Message" value={input} onChange={(e) => setInput(e.target.value)} disabled={!canWrite} />
            <button className="btn-sm" disabled={busy || !input.trim() || !canWrite}>Send</button>
          </form>
        </Card>
      </div>
      <p className="mt-3 text-xs text-muted">AI responses may contain mistakes. Verify important details before acting on them.</p>
    </div>
  );
}
