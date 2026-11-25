import "server-only";
import dns from "node:dns/promises";
import net from "node:net";

function isPrivate(ip: string) {
  if (net.isIPv6(ip)) return ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80") || ip.startsWith("::ffff:127.");
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a >= 224;
}

/** Blocks non https URLs and any host resolving to a private or loopback address (SSRF guard). */
export async function assertPublicUrl(raw: string, opts: { allowHttp?: boolean } = {}) {
  const u = new URL(raw);
  if (u.protocol !== "https:" && !(opts.allowHttp && u.protocol === "http:")) throw new Error("Only https URLs are allowed");
  const host = u.hostname;
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivate(a.address))) throw new Error("URL resolves to a private address");
  return u;
}

export async function safeFetch(raw: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const u = await assertPublicUrl(raw, { allowHttp: true });
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), init.timeoutMs ?? 8000);
  try { return await fetch(u, { ...init, signal: ctl.signal, redirect: "manual" }); } finally { clearTimeout(t); }
}
