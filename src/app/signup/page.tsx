"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signupSchema, friendlyAuthError } from "@/lib/validation";
import { AuthShell, Alert, Field } from "@/components/AuthShell";

export default function SignupPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { fullName, companyName, email, password } = parsed.data;
      const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { data, error } = await createClient().auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, company_name: companyName },
          emailRedirectTo: `${site}/auth/callback?next=/dashboard`,
        },
      });
      if (error) { setFormError(friendlyAuthError(error.message)); return; }
      // Supabase returns an obfuscated user with no identities when the email is already registered.
      if (data.user && data.user.identities?.length === 0) {
        setFormError("An account with this email already exists. Try signing in.");
        return;
      }
      if (data.session) { router.replace("/dashboard"); router.refresh(); return; }
      router.replace(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setFormError(friendlyAuthError(err instanceof Error ? err.message : "Something went wrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Start turning sales intelligence into revenue.">
      {formError && <Alert kind="error">{formError}</Alert>}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field id="fullName" label="Full name" autoComplete="name" error={errors.fullName} />
        <Field id="companyName" label="Company name" autoComplete="organization" error={errors.companyName} />
        <Field id="email" label="Work email" type="email" autoComplete="email" error={errors.email} />
        <Field id="password" label="Password" type="password" autoComplete="new-password" error={errors.password} />
        <p className="text-xs text-muted">At least 8 characters, with a letter and a number.</p>
        <button className="btn" disabled={loading}>{loading ? "Creating account..." : "Create account"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">Already have an account? <Link href="/login" className="font-medium text-teal hover:underline">Sign in</Link></p>
    </AuthShell>
  );
}
