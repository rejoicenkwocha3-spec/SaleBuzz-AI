"use client";
import { useState } from "react";
import { SiteLayout, Hero } from "@/components/site/SiteLayout";
import { Alert, Field } from "@/components/AuthShell";

export default function Page() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setState("sending");
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const r = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (r?.ok) setState("sent"); else { setState("idle"); setError((await r?.json().catch(() => null))?.error || "Could not send your message."); }
  }
  return (
    <SiteLayout>
      <Hero eyebrow="Contact" title="Talk to the SalesBuzz AI team" text="Questions about plans, setup, or integrations? Send a message and we will reply by email." />
      <section className="mx-auto max-w-xl px-5 pb-20">
        {state === "sent" ? <Alert kind="success">Thank you. Your message was sent.</Alert> : (
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            {error && <Alert kind="error">{error}</Alert>}
            <Field id="name" label="Name" required /><Field id="email" label="Work email" type="email" required /><Field id="company" label="Company" />
            <div><label htmlFor="message" className="label">Message</label><textarea id="message" name="message" required minLength={10} rows={5} className="input" /></div>
            <button className="btn" disabled={state === "sending"}>{state === "sending" ? "Sending..." : "Send message"}</button>
          </form>
        )}
      </section>
    </SiteLayout>
  );
}
