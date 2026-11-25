// Prices and billing terms below were read from the live Selar checkout pages:
// each is a recurring monthly subscription, with an email before every charge, cancel anytime.
// Selar shows no plan names or feature lists, so none are invented here. Edit this file to add yours.
export type Plan = { id: string; label: string; price: number; url: string; terms: string[] };

const TERMS = [
  "Billed monthly as a recurring subscription",
  "Email notice before every charge",
  "Cancel anytime through Selar",
];

export const PLANS: Plan[] = [
  { id: "plan1", label: "Plan 1", price: 47, url: "https://selar.com/47plan?currency=USD", terms: TERMS },
  { id: "plan2", label: "Plan 2", price: 57, url: "https://selar.com/57plan?currency=USD", terms: TERMS },
  { id: "plan3", label: "Plan 3", price: 97, url: "https://selar.com/97plan?currency=USD", terms: TERMS },
];

export const planByAmount = (amount: number) => PLANS.find((p) => Math.round(p.price) === Math.round(amount));
