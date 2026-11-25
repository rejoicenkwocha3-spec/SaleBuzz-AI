import "server-only";

export type Msg = { role: "user" | "assistant"; content: string };
export type AiResult = { text: string; model: string; inputTokens: number; outputTokens: number };

/**
 * Modular provider layer. Pick with AI_PROVIDER = "anthropic" (default) or "openai" (any OpenAI compatible API).
 * Keys stay server side: ANTHROPIC_API_KEY, or OPENAI_API_KEY (+ optional OPENAI_BASE_URL).
 */
export function aiConfigured() {
  return process.env.AI_PROVIDER === "openai" ? !!process.env.OPENAI_API_KEY : !!process.env.ANTHROPIC_API_KEY;
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) {
      last = e;
      if (e instanceof Error && (e as Error & { fatal?: boolean }).fatal) throw e;
      await new Promise((r) => setTimeout(r, 600 * 2 ** i));
    }
  }
  throw last;
}
function failure(status: number, body: string) {
  const e = new Error(`AI provider error ${status}: ${body.slice(0, 200)}`) as Error & { fatal?: boolean };
  e.fatal = status !== 429 && status < 500;
  return e;
}

export async function generate(opts: { system: string; messages: Msg[]; maxTokens?: number }): Promise<AiResult> {
  const maxTokens = opts.maxTokens ?? 1500;
  if (process.env.AI_PROVIDER === "openai") {
    const model = process.env.AI_MODEL || "gpt-4o-mini";
    const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    return withRetry(async () => {
      const r = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "system", content: opts.system }, ...opts.messages] }),
      });
      if (!r.ok) throw failure(r.status, await r.text());
      const j = await r.json();
      return { text: j.choices?.[0]?.message?.content ?? "", model, inputTokens: j.usage?.prompt_tokens ?? 0, outputTokens: j.usage?.completion_tokens ?? 0 };
    });
  }
  const model = process.env.AI_MODEL || "claude-sonnet-5-5";
  return withRetry(async () => {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: maxTokens, system: opts.system, messages: opts.messages }),
    });
    if (!r.ok) throw failure(r.status, await r.text());
    const j = await r.json();
    const text = (j.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
    return { text, model, inputTokens: j.usage?.input_tokens ?? 0, outputTokens: j.usage?.output_tokens ?? 0 };
  });
}

/** Ask for JSON and parse it defensively. */
export async function generateJson<T>(opts: { system: string; prompt: string; maxTokens?: number }) {
  const res = await generate({
    system: opts.system + "\nRespond with a single JSON object only. No markdown fences, no commentary.",
    messages: [{ role: "user", content: opts.prompt }], maxTokens: opts.maxTokens ?? 2200,
  });
  const m = res.text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("The AI response was not valid JSON");
  return { data: JSON.parse(m[0]) as T, res };
}
