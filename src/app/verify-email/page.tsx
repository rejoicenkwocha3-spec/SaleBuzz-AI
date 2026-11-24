import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";

export default async function VerifyEmail({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <AuthShell title="Check your email" subtitle="One more step to activate your account.">
      <p className="text-sm">We sent a verification link{email ? <> to <strong>{email}</strong></> : null}. Open it to confirm your email and you will be taken to your dashboard.</p>
      <p className="mt-4 text-sm text-muted">Did not get it? Check your spam folder, or try signing up again after a few minutes.</p>
      <Link href="/login" className="btn mt-6">Back to sign in</Link>
    </AuthShell>
  );
}
