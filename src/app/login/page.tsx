"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, safeNext, friendlyAuthError } from "@/lib/validation";
import { AuthShell, Alert, Field } from "@/components/AuthShell";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState(
    params.get("error") === "config" ? "The app is missing its Supabase configuration." :
    params.get("error") === "callback" ? "That link is invalid or has expired. Please try again." : ""
  );
  const [loading, setLoading] = useState(false);
  const notice = params.get("reset") === "1" ? "Password updated. Sign in with your new password." : "";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { error } = await createClient().auth.signInWithPassword(parsed.data);
      if (error) { setFormError(friendlyAuthError(error.message)); return; }
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch (err) {
      setFormError(friendlyAuthError(err instanceof Error ? err.message : "Something went wrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Sign in" subtitle="Welcome back to SalesBuzz AI.">
      {notice && <Alert kind="success">{notice}</Alert>}
      {formError && <Alert kind="error">{formError}</Alert>}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field id="email" label="Work email" type="email" autoComplete="email" error={errors.email} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" error={errors.password} />
        <div className="text-right text-sm"><Link href="/forgot-password" className="text-teal hover:underline">Forgot password?</Link></div>
        <button className="btn" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">New to SalesBuzz AI? <Link href="/signup" className="font-medium text-teal hover:underline">Create an account</Link></p>
    </AuthShell>
  );
}

export default function Page() { return <Suspense><LoginForm /></Suspense>; }
