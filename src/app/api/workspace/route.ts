import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/api";

export async function POST(req: Request) {
  const { workspaceId } = await req.json().catch(() => ({}));
  const c = await getApiContext(workspaceId);
  if ("error" in c) return c.error;
  const res = NextResponse.json({ ok: true });
  res.cookies.set("sb_ws", workspaceId, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 31536000 });
  return res;
}
