import Link from "next/link";
import { SiteLayout, Hero, Section, Cards, CTA, DashboardMockup } from "@/components/site/SiteLayout";
import { PLANS } from "@/lib/plans";

const FAQ = [
  ["What does SalesBuzz AI do?", "It brings your leads, accounts, buying signals, AI research, and sales workflows into one workspace so your team knows who to contact and why."],
  ["Where do buying signals come from?", "Only from sources you connect or data you provide: your product, your website tools, Segment, Zapier, webhooks, CSV imports, and manual entries. We never invent signals."],
  ["Is the AI grounded in my data?", "Yes. The assistant and account research use your workspace records. When information is missing, it says so instead of guessing."],
  ["Can my team work in one workspace?", "Yes. Invite teammates with owner, admin, member, or viewer roles. Every record belongs to one workspace and is protected by row level security."],
  ["How does billing work?", "Plans are monthly subscriptions through Selar. Access activates after your payment is verified, not when you click a checkout link."],
];

export default function Home() {
  return (
    <SiteLayout>
      <Hero eyebrow="AI powered sales intelligence" title="Discover the right prospects. Understand buyer intent. Turn intelligence into revenue." text="SalesBuzz AI helps your team find who to sell to, see who is ready to buy, and know what to do next, all in one connected workspace.">
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="rounded-lg bg-navy px-6 py-3 font-semibold text-white hover:bg-navy-deep">Get started</Link>
          <Link href="/platform" className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-navy hover:bg-white">See the platform</Link>
        </div>
        <DashboardMockup />
      </Hero>
      <Section title="Five questions every sales team needs answered" text="SalesBuzz AI is built around the decisions your team makes every day.">
        <Cards cols={3} items={[
          { title: "Who should we sell to?", text: "Search and filter prospects by industry, size, role, location, and technology, then save lists your team can act on." },
          { title: "Who is showing intent?", text: "Track real buying signals from your connected sources and see their strength, source, and date on one timeline." },
          { title: "Who will convert?", text: "Transparent lead scoring explains exactly why each prospect scored the way they did, using rules you control." },
          { title: "What should reps do next?", text: "The AI assistant recommends prospects to contact, drafts emails, and suggests discovery questions from your own data." },
          { title: "How do we win more revenue?", text: "Pipeline, conversion, and rep activity reports show where deals move and where they stall." },
          { title: "How do we save time?", text: "Workflows assign leads, create tasks, and alert your team the moment a high intent prospect appears." },
        ]} />
      </Section>
      <Section tint title="Intelligence, efficiency, growth" text="One platform for the full path from prospect to revenue.">
        <Cards cols={3} items={[
          { title: "Intelligence", text: "Understand prospects and buying signals with AI that stays grounded in the data you connect.", href: "/platform" },
          { title: "Efficiency", text: "Automate research, lead management, and repetitive follow up so reps spend time selling.", href: "/features" },
          { title: "Growth", text: "Identify opportunities earlier and convert more prospects with clear next actions.", href: "/solutions" },
        ]} />
      </Section>
      <Section title="Everything in one connected platform">
        <Cards cols={3} items={[
          { title: "Lead discovery", text: "Filter by firmographics and role, save searches, and build prospect lists.", href: "/features" },
          { title: "Lead enrichment", text: "Add company details with the source and last updated date shown on every field.", href: "/features" },
          { title: "Buying signals", text: "Capture website visits, signups, usage, and custom events through webhooks and imports.", href: "/features" },
          { title: "AI account research", text: "Generate sourced account reports that clearly mark anything the data cannot support.", href: "/features" },
          { title: "Workflow automation", text: "Trigger notifications, assignments, and tasks when conditions are met.", href: "/features" },
          { title: "Analytics", text: "Reports on lead generation, pipeline, rep activity, and workflow performance with CSV download.", href: "/features" },
        ]} />
      </Section>
      <Section tint title="Customer use cases">
        <Cards cols={3} items={[
          { title: "Sales teams", text: "Prioritize accounts by score and signals, and never lose track of a follow up." },
          { title: "Revenue operations", text: "Keep scoring rules, assignment, and reporting consistent across the team." },
          { title: "Founders", text: "Run a structured outbound process without hiring a full operations team." },
        ]} />
      </Section>
      <Section title="Simple monthly pricing" text="Three monthly plans, billed through Selar. Cancel anytime.">
        <div className="grid gap-5 sm:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.id} className="rounded-2xl border border-slate-200 p-6"><p className="font-semibold text-navy">{p.label}</p><p className="mt-2 font-heading text-4xl font-extrabold text-navy">${p.price}<span className="text-base font-medium text-muted"> per month</span></p></div>
          ))}
        </div>
        <Link href="/pricing" className="mt-6 inline-block font-semibold text-teal">Compare plans</Link>
      </Section>
      <Section tint title="Frequently asked questions">
        <div className="max-w-3xl space-y-3">{FAQ.map(([q, a]) => (
          <details key={q} className="rounded-xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-semibold text-navy">{q}</summary><p className="mt-3 text-sm text-muted">{a}</p></details>
        ))}</div>
      </Section>
      <CTA />
    </SiteLayout>
  );
}
