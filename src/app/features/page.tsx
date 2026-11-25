import { SiteLayout, Hero, Section, Cards, CTA, DashboardMockup } from "@/components/site/SiteLayout";
export const metadata = { title: "Features | SalesBuzz AI" };
export default function Page() {
  return (
    <SiteLayout>
      <Hero eyebrow="Features" title="Every tool a revenue team needs, in one place" text="From the first prospect search to the closed deal, each feature uses the same workspace data."><DashboardMockup /></Hero>
      <Section title="Product features">
        <Cards items={[
          { title: "Sales intelligence dashboard", text: "Leads, qualified prospects, high intent accounts, pipeline value, conversion, activity, and recommended next actions, all calculated from your records.", href: "/signup" },
          { title: "AI lead discovery", text: "Filter and save searches, then build prospect lists. Connect your own data providers for external prospect data.", href: "/signup" },
          { title: "Lead enrichment", text: "Pull public details from a company website and add your own, each stamped with source and date. Review and correct anything.", href: "/signup" },
          { title: "Buying signal intelligence", text: "Receive signals through webhooks and imports, create custom rules, and view a timeline for each prospect.", href: "/signup" },
          { title: "Explainable lead scoring", text: "Configure weights for fit, role, engagement, signals, and activity. Every score lists its reasons.", href: "/signup" },
          { title: "AI account research", text: "Reports on overview, products, challenges, opportunities, and next steps, with sources and clear labels for inference.", href: "/signup" },
          { title: "AI sales assistant", text: "Ask about your pipeline, draft emails, plan follow ups, and get discovery questions. It only uses your workspace data.", href: "/signup" },
          { title: "Workflow automation", text: "Notify, assign, create tasks, update status, and call Slack or webhooks. Review every run and error.", href: "/signup" },
          { title: "CRM management", text: "Leads, contacts, companies, accounts, opportunities, notes, tasks, tags, import, and export, in table and pipeline views.", href: "/signup" },
          { title: "Analytics and reports", text: "Date filtered reports with downloadable CSV files.", href: "/signup" },
          { title: "Integrations", text: "HubSpot, Slack, webhooks, Segment, Zapier, and CSV. Status is shown only after a successful authentication.", href: "/signup" },
          { title: "Team and security", text: "Roles, invitations, audit logs, data export, and account deletion.", href: "/signup" },
        ]} />
      </Section>
      <CTA />
    </SiteLayout>
  );
}
