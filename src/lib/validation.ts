import { z } from "zod";

export const emailSchema = z.string().trim().min(1, "Enter your email address").email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/[0-9]/, "Password must include a number");

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  companyName: z.string().trim().min(2, "Enter your company name").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password") });

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

export function friendlyAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Incorrect email or password.";
  if (m.includes("email not confirmed")) return "Please verify your email first. Check your inbox for the confirmation link.";
  if (m.includes("already registered")) return "An account with this email already exists. Try signing in.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a few minutes and try again.";
  if (m.includes("weak") || m.includes("password should")) return "Choose a stronger password.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Network error. Check your connection and try again.";
  if (m.includes("invalid api key")) return "The app is not configured with a valid Supabase key.";
  return message;
}
