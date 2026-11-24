"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { passwordSchema, friendlyAuthError } from "@/lib/validation";
import { AuthShell, Alert, Field } from "@/components/AuthShell";

export default function ResetPassword() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => setReady(!!data.session));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const pw = passwordSchema.safeParse(fd.get("password"));
    const errs: Record<string, string> = {};
    if (!pw.success) errs.password = pw.error.issues[0].message;
    if (fd.get("password") !== fd.get("confirm")) errs.confirm = "Passwords do not match";
    setErrors(errs);
    if (Object.keys(errs).length || !pw.success) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pw.data });
      if (error) { setError(friendlyAuthError(error.message)); return; }
      await supabase.auth.signOut();
      router.replace("/login?reset=1");
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : "Something went wrong"));
    } finally { setLoading(false); }
  }

  if (ready === false) {
    return (
      <AuthShell title="Link expired" subtitle="This reset link is invalid or has expired.">
        <Link href="/forgot-password" className="btn">Request a new link</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Choose a new password">
      {error && <Alert kind="error">{error}</Alert>}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field id="password" label="New password" type="password" autoComplete="new-password" error={errors.password} />
        <Field id="confirm" label="Confirm password" type="password" autoComplete="new-password" error={errors.confirm} />
        <button className="btn" disabled={loading || ready === null}>{loading ? "Saving..." : "Update password"}</button>
      </form>
    </AuthShell>
  );
}
