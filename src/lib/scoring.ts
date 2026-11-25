// Configurable lead scoring. Pure functions, usable in the browser and on the server.
export type ScoreWeights = Record<string, number>;
export const DEFAULT_WEIGHTS: ScoreWeights = {
  industry_fit: 20, company_size: 15, job_role: 20, intent: 10, signals: 20, website_activity: 5, product_activity: 5, source_history: 5,
};
export const CRITERIA_LABELS: Record<string, string> = {
  industry_fit: "Industry fit", company_size: "Company size", job_role: "Job role", intent: "Engagement and intent",
  signals: "Buying signals", website_activity: "Website activity", product_activity: "Product activity", source_history: "Historical conversion by source",
};
export type Prefs = { target_industries?: string[]; target_sizes?: string[]; target_titles?: string[] };
export type ScoreInput = {
  industry?: string | null; company_size?: string | null; job_title?: string | null; seniority?: string | null;
  status?: string | null; intent?: string | null; source?: string | null;
};
export type SignalLite = { type: string; strength: number; occurred_at: string };
export type Reason = { criterion: string; label: string; points: number; max: number; why: string };

const has = (list: string[] | undefined, v?: string | null) => !!v && !!list?.some((x) => x.trim() && v.toLowerCase().includes(x.trim().toLowerCase()));

export function scoreLead(lead: ScoreInput, prefs: Prefs, signals: SignalLite[], weights: ScoreWeights = {}, sourceRate?: number, overallRate?: number) {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const reasons: Reason[] = [];
  const add = (criterion: string, frac: number, why: string) => {
    const max = w[criterion] ?? 0;
    reasons.push({ criterion, label: CRITERIA_LABELS[criterion], max, points: Math.round(max * Math.max(0, Math.min(1, frac))), why });
  };
  const hasInd = !!prefs.target_industries?.length, hasSize = !!prefs.target_sizes?.length, hasTitles = !!prefs.target_titles?.length;

  add("industry_fit", !hasInd ? 0 : has(prefs.target_industries, lead.industry) ? 1 : 0,
    !hasInd ? "No target industries set in Settings" : has(prefs.target_industries, lead.industry) ? `${lead.industry} is a target industry` : "Industry is outside your targets");
  add("company_size", !hasSize ? 0 : has(prefs.target_sizes, lead.company_size) ? 1 : 0,
    !hasSize ? "No target company sizes set in Settings" : has(prefs.target_sizes, lead.company_size) ? `${lead.company_size} matches a target size` : "Company size is outside your targets");
  const senior = /(chief|ceo|cfo|cto|cmo|coo|vp|vice president|head|director|founder|owner|president)/i.test(`${lead.job_title ?? ""} ${lead.seniority ?? ""}`);
  const titleMatch = hasTitles && has(prefs.target_titles, lead.job_title);
  add("job_role", titleMatch ? 1 : senior ? 0.7 : lead.job_title ? 0.3 : 0,
    titleMatch ? `${lead.job_title} matches a target title` : senior ? "Senior decision maker role" : lead.job_title ? "Role is not senior or targeted" : "No job title recorded");
  const stage = { new: 0, contacted: 0.4, qualified: 0.8, unqualified: 0, converted: 1 }[lead.status ?? "new"] ?? 0;
  const intent = { high: 1, medium: 0.6, low: 0.25, unknown: 0 }[lead.intent ?? "unknown"] ?? 0;
  add("intent", Math.max(stage, intent), `Status ${lead.status ?? "new"}, intent ${lead.intent ?? "unknown"}`);

  const cutoff = Date.now() - 90 * 86400_000;
  const recent = signals.filter((s) => new Date(s.occurred_at).getTime() >= cutoff);
  const strength = recent.reduce((a, s) => a + s.strength, 0);
  add("signals", Math.min(1, strength / 150), recent.length ? `${recent.length} signals in the last 90 days, combined strength ${strength}` : "No signals received");
  const web = recent.filter((s) => /website|page|visit/i.test(s.type));
  add("website_activity", Math.min(1, web.length / 3), web.length ? `${web.length} website activity signals` : "No website activity");
  const prod = recent.filter((s) => /product|usage|signup|trial/i.test(s.type));
  add("product_activity", Math.min(1, prod.length / 3), prod.length ? `${prod.length} product activity signals` : "No product activity");
  const hist = sourceRate != null && overallRate != null && overallRate > 0 ? Math.min(1, sourceRate / (overallRate * 2)) : 0;
  add("source_history", hist, sourceRate != null ? `Leads from ${lead.source} convert at ${(sourceRate * 100).toFixed(0)}% vs ${((overallRate ?? 0) * 100).toFixed(0)}% overall` : "Not enough conversion history for this source");

  const total = Math.max(0, Math.min(100, reasons.reduce((a, r) => a + r.points, 0)));
  const maxTotal = reasons.reduce((a, r) => a + r.max, 0) || 100;
  const score = Math.round((total / maxTotal) * 100);
  return { score, reasons };
}
