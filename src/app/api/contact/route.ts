import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rateLimit";

const schema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email(), company: z.string().trim().max(100).optional(), message: z.string().trim().min(10).max(3000) });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon";
  if (!rateLimit(`contact:${ip}`, 5, 600_000)) return NextResponse.json({ error: "Too many messages. Try again later." }, { status: 429 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0].message }, { status: 400 });
  if (!hasServiceRole()) return NextResponse.json({ error: "Messages are temporarily unavailable." }, { status: 503 });
  const { error } = await createAdminClient().from("sb_contact_messages").insert(p.data);
  if (error) return NextResponse.json({ error: "Could not send your message." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
