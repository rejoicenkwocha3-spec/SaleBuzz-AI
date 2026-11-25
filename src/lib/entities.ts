export type Field = {
  key: string; label: string; type?: "text" | "email" | "number" | "date" | "select" | "textarea" | "tags" | "bool" | "owner" | "company" | "url";
  options?: string[]; required?: boolean; table?: boolean; sortable?: boolean;
};
export type Filter = { key: string; label: string; type: "select" | "text"; options?: string[] };
export type Entity = {
  key: string; table: string; title: string; singular: string; text: string; fields: Field[]; filters: Filter[];
  search: string[]; sort: string; base?: Record<string, unknown>; pipeline?: { field: string; stages: string[] }; entityType?: string; discovery?: boolean;
};

const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"];
const REVENUE = ["Under $1M", "$1M to $10M", "$10M to $50M", "$50M to $250M", "$250M to $1B", "Over $1B"];
const SENIORITY = ["Owner or founder", "C level", "VP", "Director", "Manager", "Individual contributor"];
const DEPT = ["Sales", "Marketing", "Operations", "Finance", "Engineering", "Product", "Human resources", "IT", "Customer success", "Executive"];

export const LEAD_STATUS = ["new", "contacted", "qualified", "unqualified", "converted"];
export const INTENT = ["unknown", "low", "medium", "high"];
export const STAGES = ["qualification", "discovery", "proposal", "negotiation", "won", "lost"];

export const ENTITIES: Record<string, Entity> = {
  leads: {
    key: "leads", table: "sb_leads", title: "Leads", singular: "lead", entityType: "lead", discovery: true,
    text: "Discover, filter, and prioritize prospects. Scores explain themselves.",
    search: ["name", "email", "company_name", "job_title"], sort: "created_at",
    fields: [
      { key: "name", label: "Name", required: true, table: true, sortable: true },
      { key: "email", label: "Email", type: "email" },
      { key: "company_name", label: "Company", table: true, sortable: true },
      { key: "job_title", label: "Job title", table: true },
      { key: "department", label: "Department", type: "select", options: DEPT },
      { key: "seniority", label: "Seniority", type: "select", options: SENIORITY },
      { key: "industry", label: "Industry" },
      { key: "company_size", label: "Company size", type: "select", options: SIZES },
      { key: "location", label: "Location" },
      { key: "revenue_range", label: "Revenue range", type: "select", options: REVENUE },
      { key: "technologies", label: "Technologies used" },
      { key: "source", label: "Source" },
      { key: "status", label: "Status", type: "select", options: LEAD_STATUS, table: true, sortable: true },
      { key: "intent", label: "Buying intent", type: "select", options: INTENT, table: true, sortable: true },
      { key: "owner_id", label: "Owner", type: "owner", table: true },
      { key: "tags", label: "Tags", type: "tags" },
    ],
    filters: [
      { key: "status", label: "Status", type: "select", options: LEAD_STATUS }, { key: "intent", label: "Buying intent", type: "select", options: INTENT },
      { key: "industry", label: "Industry", type: "text" }, { key: "company_size", label: "Company size", type: "select", options: SIZES },
      { key: "location", label: "Location", type: "text" }, { key: "job_title", label: "Job title", type: "text" },
      { key: "department", label: "Department", type: "select", options: DEPT }, { key: "seniority", label: "Seniority", type: "select", options: SENIORITY },
      { key: "revenue_range", label: "Revenue", type: "select", options: REVENUE }, { key: "technologies", label: "Technology", type: "text" },
    ],
  },
  contacts: {
    key: "contacts", table: "sb_contacts", title: "Contacts", singular: "contact", entityType: "contact",
    text: "People at your companies, with consent status for responsible outreach.",
    search: ["first_name", "last_name", "email", "job_title"], sort: "created_at",
    fields: [
      { key: "first_name", label: "First name", required: true, table: true, sortable: true },
      { key: "last_name", label: "Last name", table: true, sortable: true },
      { key: "email", label: "Email", type: "email", table: true },
      { key: "phone", label: "Phone" },
      { key: "job_title", label: "Job title", table: true },
      { key: "department", label: "Department", type: "select", options: DEPT },
      { key: "seniority", label: "Seniority", type: "select", options: SENIORITY },
      { key: "linkedin_url", label: "Professional profile URL", type: "url" },
      { key: "company_id", label: "Company", type: "company", table: true },
      { key: "consent_status", label: "Consent status", type: "select", options: ["unknown", "granted", "withdrawn"], table: true },
      { key: "owner_id", label: "Owner", type: "owner" },
      { key: "tags", label: "Tags", type: "tags" },
    ],
    filters: [{ key: "consent_status", label: "Consent", type: "select", options: ["unknown", "granted", "withdrawn"] }, { key: "seniority", label: "Seniority", type: "select", options: SENIORITY }, { key: "department", label: "Department", type: "select", options: DEPT }, { key: "job_title", label: "Job title", type: "text" }],
  },
  companies: {
    key: "companies", table: "sb_companies", title: "Companies", singular: "company", entityType: "company",
    text: "Every organization you track. Mark the ones you actively pursue as target accounts.",
    search: ["name", "website", "industry", "location"], sort: "created_at",
    fields: [
      { key: "name", label: "Name", required: true, table: true, sortable: true },
      { key: "website", label: "Website", type: "url", table: true },
      { key: "industry", label: "Industry", table: true, sortable: true },
      { key: "size", label: "Company size", type: "select", options: SIZES, table: true },
      { key: "location", label: "Location" },
      { key: "revenue_range", label: "Revenue range", type: "select", options: REVENUE },
      { key: "technologies", label: "Technologies used" },
      { key: "is_account", label: "Target account", type: "bool", table: true },
      { key: "owner_id", label: "Owner", type: "owner" },
      { key: "source", label: "Source" },
      { key: "notes", label: "Notes", type: "textarea" },
      { key: "tags", label: "Tags", type: "tags" },
    ],
    filters: [{ key: "industry", label: "Industry", type: "text" }, { key: "size", label: "Size", type: "select", options: SIZES }, { key: "location", label: "Location", type: "text" }, { key: "revenue_range", label: "Revenue", type: "select", options: REVENUE }, { key: "technologies", label: "Technology", type: "text" }],
  },
  accounts: {
    key: "accounts", table: "sb_companies", title: "Accounts", singular: "account", entityType: "company",
    text: "Your target accounts. Tier and own them, then track every signal and opportunity.",
    search: ["name", "website", "industry"], sort: "created_at", base: { is_account: true },
    fields: [
      { key: "name", label: "Name", required: true, table: true, sortable: true },
      { key: "account_tier", label: "Tier", type: "select", options: ["Tier 1", "Tier 2", "Tier 3"], table: true, sortable: true },
      { key: "industry", label: "Industry", table: true },
      { key: "size", label: "Company size", type: "select", options: SIZES, table: true },
      { key: "website", label: "Website", type: "url" },
      { key: "location", label: "Location" },
      { key: "owner_id", label: "Owner", type: "owner", table: true },
      { key: "notes", label: "Notes", type: "textarea" },
      { key: "tags", label: "Tags", type: "tags" },
    ],
    filters: [{ key: "account_tier", label: "Tier", type: "select", options: ["Tier 1", "Tier 2", "Tier 3"] }, { key: "industry", label: "Industry", type: "text" }],
  },
  opportunities: {
    key: "opportunities", table: "sb_opportunities", title: "Opportunities", singular: "opportunity", entityType: "opportunity",
    text: "Track deals through your pipeline in table or pipeline view.",
    search: ["name", "notes"], sort: "created_at", pipeline: { field: "stage", stages: STAGES },
    fields: [
      { key: "name", label: "Name", required: true, table: true, sortable: true },
      { key: "company_id", label: "Company", type: "company", table: true },
      { key: "stage", label: "Stage", type: "select", options: STAGES, table: true, sortable: true },
      { key: "value", label: "Value (USD)", type: "number", table: true, sortable: true },
      { key: "probability", label: "Probability (%)", type: "number" },
      { key: "close_date", label: "Expected close", type: "date", table: true, sortable: true },
      { key: "owner_id", label: "Owner", type: "owner", table: true },
      { key: "source", label: "Source" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    filters: [{ key: "stage", label: "Stage", type: "select", options: STAGES }],
  },
};
