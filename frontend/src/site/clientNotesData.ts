/**
 * Hosting, domain and email budget shown on /client-notes.
 * Prices researched 3 Oct 2026. Update this file when providers change prices.
 */

export const CHECKED_ON = '3 October 2026';
/** Mid-market rate on 3 Oct 2026 was 129.56; rounded up for a safe budget. */
export const KES_PER_USD = 130;

export const DOMAIN = {
  name: 'verdescope.co.ke',
  status: 'Available — KeNIC WHOIS returned “No Object Found” on 3 Oct 2026. Register it soon to secure it.',
  registrars: [
    { name: 'Truehost Kenya', register: 1000, renew: 1500 },
    { name: 'Novahost Kenya', register: 1160, renew: 1250 },
    { name: 'HostGuru Kenya', register: 1499, renew: 1499 },
  ],
  budgetPerYear: 1500,
  note: 'KeNIC raised its .co.ke wholesale fee in February 2025 (≈ KES 700 → KES 999 + VAT), so retail prices now sit around KES 1,150–1,500 a year. Compare renewal prices, not just the first-year offer.',
};

export type HostingPlan = { id: string; name: string; usd: number; label: string; detail: string };
export const HOSTING: HostingPlan[] = [
  { id: 'hobby', name: 'Railway Hobby', usd: 8, label: 'Recommended to launch',
    detail: '$5/month subscription including $5 of usage. Estimated usage for this site (web app + PostgreSQL + 5 GB uploads + traffic) is about $7–9/month, so expect ≈ $8. Volumes are capped at 5 GB; outbound SMTP is blocked, so emails are sent through Resend.' },
  { id: 'pro', name: 'Railway Pro', usd: 20, label: 'When the team or traffic grows',
    detail: '$20/month including $20 of usage, which covers this site. Adds unlimited team seats, volumes up to 1 TB, SMTP support and priority support.' },
];

/** Estimated monthly usage on Railway's usage rates ($10/GB RAM, $20/vCPU, $0.15/GB volume, $0.05/GB egress). */
export const USAGE_ESTIMATE = [
  { item: 'Web app (FastAPI + website), ~0.35 GB RAM, light CPU', usd: 4.1 },
  { item: 'PostgreSQL database, ~0.2 GB RAM + 1 GB storage', usd: 2.35 },
  { item: 'Uploads volume (photos, videos, documents), 5 GB', usd: 0.75 },
  { item: 'Network egress, ~20 GB/month of page and media traffic', usd: 1.0 },
];

export type EmailPlan = { id: string; name: string; perUserKes: number; perUserUsd: number; label: string; detail: string };
export const EMAIL: EmailPlan[] = [
  { id: 'gws', name: 'Google Workspace Business Starter', perUserKes: 1149, perUserUsd: 7, label: 'Recommended',
    detail: 'Gmail on @verdescope.co.ke, 30 GB per user, Drive, Docs, Meet (100 people). KES 1,149/user/month via a Kenyan reseller (fixed KES price, M-Pesa), or $7/user/month direct from Google on an annual plan.' },
  { id: 'm365', name: 'Microsoft 365 Business Basic', perUserKes: 950, perUserUsd: 7, label: 'If the team prefers Outlook',
    detail: 'Outlook/Exchange email, 50 GB mailbox, Teams, web Office. From KES 950/user/month (excl. VAT) via Kenyan partners; $7/user/month direct since July 2026.' },
  { id: 'zoho', name: 'Zoho Mail Lite', perUserKes: 130, perUserUsd: 1, label: 'Lowest cost',
    detail: 'Professional email only, 5 GB per user, $1/user/month billed annually. A free plan exists for up to 5 users, but it is web/app only (no Outlook/IMAP).' },
];

export const TRANSACTIONAL = [
  { id: 'free', name: 'Resend Free', usd: 0, detail: '3,000 emails/month (100/day). Enough for portal replies and notifications at launch.' },
  { id: 'pro', name: 'Resend Pro', usd: 20, detail: '50,000 emails/month with no daily cap. Only needed for newsletters or very high volume.' },
];

export const SOURCES: [string, string][] = [
  ['Railway pricing', 'https://railway.com/pricing'],
  ['Railway outbound networking (SMTP on Pro only)', 'https://docs.railway.com/networking/outbound-networking'],
  ['.co.ke domain price comparison (Novahost)', 'https://novahost.co.ke/blog/domain-name-cost-in-kenya-price-comparison/'],
  ['Truehost .ke domains', 'https://truehost.co.ke/ke-domain/'],
  ['HostGuru .co.ke pricing', 'https://hostguru.co.ke/domains/co-ke/'],
  ['Google Workspace cost in Kenya (Truehost)', 'https://truehost.co.ke/google-workspace-cost-in-kenya/'],
  ['Microsoft 365 price in Kenya (Novahost)', 'https://novahost.co.ke/blog/microsoft-365-price-in-kenya/'],
  ['Zoho Mail pricing', 'https://www.zoho.com/mail/zohomail-pricing.html'],
  ['Resend pricing', 'https://resend.com/pricing'],
];
