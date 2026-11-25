import { SiteLayout, Hero, Section, Cards, CTA } from "@/components/site/SiteLayout";
export const metadata = { title: "About | SalesBuzz AI" };
export default function Page() {
  return (
    <SiteLayout>
      <Hero eyebrow="About" title="Sales teams should sell, not search" text="SalesBuzz AI exists to remove the manual work between a possible customer and a conversation that matters." />
      <Section title="What we believe">
        <Cards items={[
          { title: "Honest intelligence", text: "We show signals and data only when they come from a connected source or from you. AI output is labeled and grounded." },
          { title: "Private by design", text: "Prospect data is sensitive. Every record belongs to one workspace and is protected by row level security." },
          { title: "Useful over flashy", text: "Every screen exists to answer who to contact, why, and what to do next." },
        ]} />
      </Section>
      <CTA />
    </SiteLayout>
  );
}
