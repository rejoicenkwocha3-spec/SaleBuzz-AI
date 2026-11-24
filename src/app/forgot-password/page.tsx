"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { emailSchema, friendlyAuthError } from "@/lib/validation";
import { AuthShell, Alert, Field } from "@/components/AuthShell";

export default function ForgotPassword() {
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const parsed = emailSchema.safeParse(new FormData(e.currentTarget).get("email"));
    if (!parsed.success) { setFieldError(parsed.error.issues[0].message); return; }
    setFieldError("");
    setLoading(true);
    try {
      const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error } = await createClient().auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${site}/auth/callback?next=/reset-password`,
      });
      if (error) { setError(friendlyAuthError(error.message)); return; }
      setSent(true);
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : "Something went wrong"));
    } finally { setLoading(false); }
  }

  return (
    <AuthShell title="Reset your password" subtitle="We will email you a secure reset link.">
      {sent ? <Alert kind="success">If an account exists for that email, a reset link is on its way.</Alert> : (
        <>
          {error && <Alert kind="error">{error}</Alert>}
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field id="email" label="Work email" type="email" autoComplete="email" error={fieldError} />
            <button className="btn" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</button>
          </form>
        </>
      )}
      <p className="mt-6 text-center text-sm"><Link href="/login" className="text-teal hover:underline">Back to sign in</Link></p>
    </AuthShell>
  );
}
