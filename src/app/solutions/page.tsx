import { SiteLayout, Hero, Section, Cards, CTA } from "@/components/site/SiteLayout";
export const metadata = { title: "Solutions | SalesBuzz AI" };
export default function Page() {
  return (
    <SiteLayout>
      <Hero eyebrow="Solutions" title="Built for every team that sells" text="Different roles, the same goal: spend less time searching and more time closing." />
      <Section>
        <Cards cols={2} items={[
          { title: "Sales teams", text: "Problem: reps chase cold accounts. Solution: scored, signal backed priorities and clear next actions." },
          { title: "Sales development representatives", text: "Problem: manual research eats the day. Solution: AI account research, email drafts, and discovery questions from your data." },
          { title: "Revenue operations teams", text: "Problem: inconsistent routing and reporting. Solution: configurable scoring, workflows, and one source of truth for reports." },
          { title: "Marketing teams", text: "Problem: unclear lead quality. Solution: signal and source attribution that shows which campaigns produce real intent." },
          { title: "Business development teams", text: "Problem: partnership and account targets scattered across tools. Solution: target accounts with owners, tiers, notes, and timelines." },
          { title: "Founders and growing businesses", text: "Problem: no time for a heavy CRM. Solution: a focused workspace that pairs lead management with AI help." },
          { title: "Enterprise sales organizations", text: "Problem: many teams and sensitive data. Solution: roles, workspace isolation, audit logs, and data export controls." },
        ]} />
      </Section>
      <CTA />
    </SiteLayout>
  );
}
