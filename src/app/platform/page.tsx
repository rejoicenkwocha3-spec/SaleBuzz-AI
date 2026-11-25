import { SiteLayout, Hero, Section, Cards, CTA } from "@/components/site/SiteLayout";
export const metadata = { title: "Platform | SalesBuzz AI" };
export default function Page() {
  return (
    <SiteLayout>
      <Hero eyebrow="Platform" title="One connected platform for sales intelligence" text="Discovery, customer intelligence, signals, enrichment, research, automation, and analytics work from the same workspace data." />
      <Section title="How it works">
        <Cards cols={2} items={[
          { title: "1. Bring in your data", text: "Import CSV files, connect HubSpot, or send events with webhooks, Segment, or Zapier. Every record is stored in your private workspace." },
          { title: "2. Understand every account", text: "Companies, contacts, leads, and opportunities connect to one timeline of notes, tasks, and signals." },
          { title: "3. Prioritize with explainable scores", text: "Scoring rules you configure turn fit and engagement into a score, with a plain explanation of every point." },
          { title: "4. Act faster with AI and workflows", text: "Ask the assistant what to do next, generate research, and let workflows handle assignment, tasks, and alerts." },
        ]} />
      </Section>
      <Section tint title="Platform capabilities">
        <Cards items={[
          { title: "Lead discovery", text: "Filter your prospect data by industry, size, location, title, department, seniority, revenue, technology, and intent." },
          { title: "Customer intelligence", text: "See companies, contacts, and opportunities together with full activity history." },
          { title: "Buying signals", text: "Receive and organize signals with strength, source, and date, plus custom rules." },
          { title: "Lead enrichment", text: "Add and review company details with the source and last updated date always visible." },
          { title: "AI research", text: "Generate account reports that separate sourced facts from inference." },
          { title: "Sales automation", text: "Build workflows with triggers, conditions, actions, history, and error logs." },
          { title: "Analytics", text: "Date filtered reports on leads, pipeline, activity, and workflows, with CSV export." },
          { title: "Integrations", text: "HubSpot, Slack, webhooks, Segment, Zapier, and CSV today, with an architecture ready for more." },
          { title: "Security", text: "Workspace isolation, role based access, row level security, and audit logs." },
        ]} />
      </Section>
      <CTA />
    </SiteLayout>
  );
}
