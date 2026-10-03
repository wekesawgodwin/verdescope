import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { CHECKED_ON, DOMAIN, EMAIL, HOSTING, KES_PER_USD, SOURCES, TRANSACTIONAL, USAGE_ESTIMATE } from './clientNotesData';
import { PageHead } from './SiteLayout';

const kes = (n: number) => 'KES ' + Math.round(n).toLocaleString('en-KE');
const usdToKes = (usd: number) => usd * KES_PER_USD;

interface Choice { hosting: string; email: string; users: number; transactional: string }

/** Monthly + yearly cost lines for a choice of providers. */
function budget(c: Choice) {
  const host = HOSTING.find((h) => h.id === c.hosting)!;
  const mail = EMAIL.find((e) => e.id === c.email);
  const tx = TRANSACTIONAL.find((t) => t.id === c.transactional)!;
  const lines = [
    { item: `Domain — ${DOMAIN.name}`, note: 'Paid yearly', monthly: DOMAIN.budgetPerYear / 12, yearly: DOMAIN.budgetPerYear },
    { item: `Hosting — ${host.name}`, note: `≈ $${host.usd}/month`, monthly: usdToKes(host.usd), yearly: usdToKes(host.usd) * 12 },
    mail
      ? { item: `Email — ${mail.name}`, note: `${c.users} mailbox${c.users === 1 ? '' : 'es'} × ${kes(mail.perUserKes)}`, monthly: mail.perUserKes * c.users, yearly: mail.perUserKes * c.users * 12 }
      : { item: 'Email — no mailboxes', note: 'Use the existing Gmail address', monthly: 0, yearly: 0 },
    { item: `Website emails — ${tx.name}`, note: tx.usd ? `$${tx.usd}/month` : 'Free tier', monthly: usdToKes(tx.usd), yearly: usdToKes(tx.usd) * 12 },
  ];
  return { lines, monthly: lines.reduce((a, l) => a + l.monthly, 0), yearly: lines.reduce((a, l) => a + l.yearly, 0) };
}

const PACKAGES: { name: string; tag: string; choice: Choice; blurb: string }[] = [
  { name: 'Lean', tag: 'Lowest cost', choice: { hosting: 'hobby', email: 'zoho', users: 3, transactional: 'free' }, blurb: 'Professional @verdescope.co.ke email on Zoho with the website on Railway Hobby.' },
  { name: 'Recommended', tag: 'Best value', choice: { hosting: 'hobby', email: 'gws', users: 3, transactional: 'free' }, blurb: 'Google Workspace mail, Drive and Meet for three staff, with the website on Railway Hobby.' },
  { name: 'Growth', tag: 'Larger team', choice: { hosting: 'pro', email: 'gws', users: 5, transactional: 'free' }, blurb: 'Railway Pro for team access and headroom, plus Google Workspace for five staff.' },
];

function BudgetTable({ c }: { c: Choice }) {
  const b = budget(c);
  return (
    <div className="table-wrap"><table className="data">
      <thead><tr><th>Item</th><th>Basis</th><th style={{ textAlign: 'right' }}>Per month</th><th style={{ textAlign: 'right' }}>Per year</th></tr></thead>
      <tbody>
        {b.lines.map((l) => <tr key={l.item}><td>{l.item}</td><td>{l.note}</td><td style={{ textAlign: 'right' }}>{kes(l.monthly)}</td><td style={{ textAlign: 'right' }}>{kes(l.yearly)}</td></tr>)}
        <tr><td colSpan={2} style={{ color: 'var(--text)', fontFamily: 'var(--head)', letterSpacing: '.12em', textTransform: 'uppercase' }}>Total</td>
          <td style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 700 }}>{kes(b.monthly)}</td>
          <td style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 700 }}>{kes(b.yearly)}</td></tr>
      </tbody>
    </table></div>
  );
}

export default function ClientNotes() {
  const [c, setC] = useState<Choice>(PACKAGES[1].choice);
  const set = (k: keyof Choice, v: string | number) => setC((x) => ({ ...x, [k]: v }));
  const live = budget(c);
  const usageTotal = USAGE_ESTIMATE.reduce((a, u) => a + u.usd, 0);

  // Internal page: keep it out of search engines
  useEffect(() => {
    const m = document.createElement('meta');
    m.name = 'robots'; m.content = 'noindex, nofollow';
    document.head.appendChild(m);
    document.title = 'Client Notes — Verde-Scope Africa';
    return () => m.remove();
  }, []);

  return (
    <>
      <PageHead title="Client Notes" img="/assets/img/stock/rift-valley.jpg" crumb="Client Notes" eyebrow="Hosting, domain & email budget" />

      <section className="section"><div className="wrap">
        <div className="sec-title row">
          <div><span className="eyebrow">Summary</span><h2>Running the <b>website</b></h2></div>
          <p style={{ maxWidth: 460, margin: 0 }}>What it costs to put the new website, portal and company email live on <b style={{ color: 'var(--text)' }}>{DOMAIN.name}</b>. Prices checked {CHECKED_ON}; USD converted at KES {KES_PER_USD}.</p>
        </div>
        <div className="grid g3">
          {PACKAGES.map((p) => {
            const b = budget(p.choice);
            const active = JSON.stringify(p.choice) === JSON.stringify(c);
            return (
              <div key={p.name} className="vm reveal" style={active ? { outline: '1px solid var(--accent)' } : undefined}>
                <span className="eyebrow">{p.tag}</span>
                <h3>{p.name}</h3>
                <p>{p.blurb}</p>
                <div style={{ fontFamily: 'var(--head)', fontSize: 34, fontWeight: 300, color: 'var(--text)', lineHeight: 1.1 }}>{kes(b.monthly)}<small style={{ fontSize: 14, color: 'var(--muted)' }}> /month</small></div>
                <p style={{ margin: '4px 0 18px' }}>{kes(b.yearly)} per year</p>
                <button className={'btn' + (active ? ' solid' : '')} onClick={() => setC(p.choice)}>{active ? 'Shown below' : 'Use this package'}</button>
              </div>
            );
          })}
        </div>
      </div></section>

      <section className="section alt"><div className="wrap">
        <div className="sec-title"><span className="eyebrow">Budget calculator</span><h2>Year-one <b>Budget</b></h2></div>
        <div className="form calc">
          <div className="field"><label htmlFor="cn-host">Hosting</label>
            <select id="cn-host" value={c.hosting} onChange={(e) => set('hosting', e.target.value)}>{HOSTING.map((h) => <option key={h.id} value={h.id}>{h.name} (≈ ${h.usd}/mo)</option>)}</select></div>
          <div className="field"><label htmlFor="cn-mail">Company email</label>
            <select id="cn-mail" value={c.email} onChange={(e) => set('email', e.target.value)}>{EMAIL.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}<option value="none">None (keep Gmail)</option></select></div>
          <div className="field"><label htmlFor="cn-users">Mailboxes: {c.users}</label>
            <input id="cn-users" type="range" min={1} max={15} value={c.users} onChange={(e) => set('users', Number(e.target.value))} disabled={c.email === 'none'} style={{ padding: '18px 0', accentColor: 'var(--accent)' }} /></div>
          <div className="field"><label htmlFor="cn-tx">Website emails</label>
            <select id="cn-tx" value={c.transactional} onChange={(e) => set('transactional', e.target.value)}>{TRANSACTIONAL.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        </div>
        <BudgetTable c={c} />
        <p style={{ marginTop: 16, fontSize: 13.5 }}>
          ≈ <b style={{ color: 'var(--text)' }}>{kes(live.monthly)}</b> a month, or <b style={{ color: 'var(--text)' }}>{kes(live.yearly)}</b> for the first year (≈ ${Math.round(live.yearly / KES_PER_USD).toLocaleString()}).
          Hosting is billed in USD by card; the domain and email can be paid in KES via M-Pesa through Kenyan resellers. Local reseller prices may exclude 16% VAT.
        </p>
      </div></section>

      <section className="section"><div className="wrap">
        <div className="sec-title"><span className="eyebrow">01 · Domain name</span><h2>{DOMAIN.name}</h2></div>
        <div className="split" style={{ alignItems: 'start' }}>
          <div>
            <div className="notice show" style={{ marginBottom: 24 }}><Icon name="check" /><div>{DOMAIN.status}</div></div>
            <p>{DOMAIN.note}</p>
            <p>Budget <b style={{ color: 'var(--text)' }}>{kes(DOMAIN.budgetPerYear)} per year</b>. It covers the website address and all company email addresses (e.g. info@{DOMAIN.name}). SSL certificates (https) are free and automatic on Railway.</p>
          </div>
          <div className="table-wrap"><table className="data">
            <thead><tr><th>Registrar</th><th style={{ textAlign: 'right' }}>Register (yr 1)</th><th style={{ textAlign: 'right' }}>Renewal / yr</th></tr></thead>
            <tbody>{DOMAIN.registrars.map((r) => <tr key={r.name}><td>{r.name}</td><td style={{ textAlign: 'right' }}>{kes(r.register)}</td><td style={{ textAlign: 'right' }}>{kes(r.renew)}</td></tr>)}</tbody>
          </table></div>
        </div>
      </div></section>

      <section className="section alt"><div className="wrap">
        <div className="sec-title"><span className="eyebrow">02 · Web hosting</span><h2>Railway <b>Hosting</b></h2>
          <p style={{ maxWidth: 760, marginTop: 18 }}>The website, portal and PostgreSQL database run as Docker containers on Railway. Railway charges a small subscription that includes usage credit, then bills actual resource use by the second, so a quiet month costs less.</p></div>
        <div className="grid g2" style={{ marginBottom: 40 }}>
          {HOSTING.map((h) => (
            <div className="vm reveal" key={h.id}><span className="eyebrow">{h.label}</span><h3>{h.name}</h3>
              <div style={{ fontFamily: 'var(--head)', fontSize: 30, fontWeight: 300, color: 'var(--text)' }}>≈ ${h.usd}/month <small style={{ fontSize: 14, color: 'var(--muted)' }}>({kes(usdToKes(h.usd))})</small></div>
              <p style={{ marginTop: 12 }}>{h.detail}</p></div>
          ))}
        </div>
        <h3 style={{ fontSize: 18, marginBottom: 16 }}>Estimated monthly usage for this website</h3>
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Resource</th><th style={{ textAlign: 'right' }}>USD / month</th><th style={{ textAlign: 'right' }}>KES / month</th></tr></thead>
          <tbody>
            {USAGE_ESTIMATE.map((u) => <tr key={u.item}><td>{u.item}</td><td style={{ textAlign: 'right' }}>${u.usd.toFixed(2)}</td><td style={{ textAlign: 'right' }}>{kes(usdToKes(u.usd))}</td></tr>)}
            <tr><td style={{ color: 'var(--text)' }}>Total usage (Hobby includes the first $5)</td><td style={{ textAlign: 'right', color: 'var(--accent)' }}>${usageTotal.toFixed(2)}</td><td style={{ textAlign: 'right', color: 'var(--accent)' }}>{kes(usdToKes(usageTotal))}</td></tr>
          </tbody>
        </table></div>
        <p style={{ marginTop: 14, fontSize: 13.5 }}>Rates: $10 per GB of RAM, $20 per vCPU, $0.15 per GB of storage and $0.05 per GB of traffic, per month. Typical Kenyan cPanel hosting (≈ KES 2,000–6,000/year) is cheaper but cannot run this Python + PostgreSQL application.</p>
      </div></section>

      <section className="section"><div className="wrap">
        <div className="sec-title"><span className="eyebrow">03 · Company email</span><h2>Email <b>Subscription</b></h2>
          <p style={{ maxWidth: 760, marginTop: 18 }}>Two separate pieces: <b style={{ color: 'var(--text)' }}>mailboxes</b> where staff send and receive email as name@{DOMAIN.name}, and a <b style={{ color: 'var(--text)' }}>sending service</b> the website uses to deliver replies from the portal's Company Email. Replies are sent from info@{DOMAIN.name}, so clients' answers land in the company mailbox.</p></div>
        <div className="grid g3" style={{ marginBottom: 40 }}>
          {EMAIL.map((m) => (
            <div className="vm reveal" key={m.id}><span className="eyebrow">{m.label}</span><h3>{m.name}</h3>
              <div style={{ fontFamily: 'var(--head)', fontSize: 28, fontWeight: 300, color: 'var(--text)' }}>{kes(m.perUserKes)}<small style={{ fontSize: 14, color: 'var(--muted)' }}> /user/month</small></div>
              <p style={{ marginTop: 12 }}>{m.detail}</p></div>
          ))}
        </div>
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Website sending service</th><th>Includes</th><th style={{ textAlign: 'right' }}>Cost</th></tr></thead>
          <tbody>{TRANSACTIONAL.map((t) => <tr key={t.id}><td>{t.name}</td><td>{t.detail}</td><td style={{ textAlign: 'right' }}>{t.usd ? `$${t.usd}/mo (${kes(usdToKes(t.usd))})` : 'Free'}</td></tr>)}</tbody>
        </table></div>
      </div></section>

      <section className="section alt"><div className="wrap">
        <div className="sec-title"><span className="eyebrow">Next steps</span><h2>Going <b>Live</b></h2></div>
        <ul className="checks" style={{ maxWidth: 820 }}>
          <li>Register {DOMAIN.name} with a KeNIC-accredited registrar (≈ {kes(DOMAIN.budgetPerYear)}/year).</li>
          <li>Create the Railway project (Hobby plan), add PostgreSQL and a 5 GB volume, and point {DOMAIN.name} at it. HTTPS is set up automatically.</li>
          <li>Subscribe to the chosen email plan and create mailboxes (e.g. info@, admin@ and one per director).</li>
          <li>Create a free Resend account, verify {DOMAIN.name} with the DNS records it provides, and add the API key to Railway.</li>
          <li>Set the company email in Portal → Settings, replace sample gallery photos and switch off demo data.</li>
        </ul>
        <div className="cta reveal" style={{ marginTop: 40 }}>
          <div><h2>Questions about the budget?</h2><p>Prices change; this page is updated whenever we re-check them.</p></div>
          <Link className="btn solid" to="/contact">Contact us</Link>
        </div>
        <p style={{ marginTop: 40, fontSize: 13 }}>Sources (checked {CHECKED_ON}):{' '}
          {SOURCES.map(([label, url], i) => <span key={url}>{i ? ' · ' : ''}<a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{label}</a></span>)}.
          Usage figures are estimates; actual hosting costs depend on traffic and stored media.</p>
      </div></section>
    </>
  );
}
