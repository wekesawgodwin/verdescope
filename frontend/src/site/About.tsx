import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { PageHead, useSite } from './SiteLayout';

export default function About() {
  const site = useSite();
  const [filter, setFilter] = useState('all');
  const rows = site?.assignments ?? [];
  const chips = useMemo(() => ['all', ...new Set(rows.map((r) => r.type)), ...[...new Set(rows.map((r) => String(r.year)))].sort().reverse()], [rows]);
  const shown = rows.filter((r) => filter === 'all' || r.type === filter || String(r.year) === filter);

  return (
    <>
      <PageHead title="About Us" img="/assets/img/stock/rift-valley.jpg" crumb="About" />
      <section className="section">
        <div className="wrap split">
          <div className="reveal">
            <span className="eyebrow">Background</span>
            <h2 style={{ fontSize: 'clamp(28px,3.4vw,42px)', fontWeight: 300 }}>Innovative, evidence-based &amp; <b style={{ color: 'var(--accent)', fontWeight: 500 }}>sustainable</b></h2>
            <p>Verde-Scope Africa Limited, previously registered as Smart Consulting Limited, is a multidisciplinary environmental and development consultancy. We specialise in environmental compliance, climate change, health and safety audits, natural resource management, research, monitoring and evaluation, GIS, spatial planning and socio-economic development.</p>
            <p>Established to bridge the gap between science, policy and development practice, we work with governments, development partners, NGOs, UN agencies, research institutions, the private sector and local communities to promote sustainable development, climate resilience, environmental stewardship and inclusive economic growth.</p>
          </div>
          <div className="about-img reveal"><img src="/assets/img/projects/field-team.jpg" alt="Field team on site" /><div className="badge"><b>2011</b><span>Serving clients since</span></div></div>
        </div>
      </section>

      <section className="section alt"><div className="wrap"><div className="grid g3">
        <div className="vm reveal"><span className="eyebrow">01</span><h3>Vision</h3><p>To become Africa's leading environmental and sustainable development consultancy delivering innovative solutions for resilient ecosystems, thriving communities and sustainable economies.</p></div>
        <div className="vm reveal"><span className="eyebrow">02</span><h3>Mission</h3><p>To provide professional consultancy services through scientific research, innovative technologies, environmental stewardship and strategic partnerships that promote sustainable development and climate resilience across Africa.</p></div>
        <div className="vm reveal"><span className="eyebrow">03</span><h3>Purpose</h3><p>To provide innovative, science-based consultancy services that promote environmental sustainability, climate resilience and sustainable development through research, technology and professional expertise.</p></div>
      </div></div></section>

      <section className="section" id="expertise"><div className="wrap">
        <div className="sec-title row">
          <div><span className="eyebrow">Across sectors</span><h2>Technical <b>Expertise</b></h2></div>
          <p style={{ maxWidth: 460, margin: 0 }}>A multidisciplinary pool of doctoral, master's and degree-qualified specialists, each with between 7 and 20+ years of experience, assembled into the right team for every assignment.</p>
        </div>
        <div className="grid g4">
          {(site?.expertise ?? []).map((x) => (
            <div className="expertise-card reveal" key={x.id}>
              <div className="ico"><Icon name={x.icon} /></div>
              <h3>{x.sector}</h3>
              <p>{x.summary}</p>
              <ul>{(x.disciplines ?? []).map((d) => <li key={d}>{d}</li>)}</ul>
            </div>
          ))}
        </div>
      </div></section>

      <section className="section alt" id="record"><div className="wrap">
        <div className="sec-title row"><div><span className="eyebrow">Track record</span><h2>Recent Key <b>Assignments</b></h2></div>
          <p style={{ maxWidth: 420, margin: 0 }}>A selection from more than 80 assignments for county and national government, development partners, financial institutions and the private sector.</p></div>
        <div className="filters">{chips.map((c) => <button key={c} className={'chip' + (filter === c ? ' active' : '')} onClick={() => setFilter(c)}>{c === 'all' ? 'All' : c}</button>)}</div>
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Assignment</th><th>Client / Funded by</th><th>Location</th><th>Year</th><th>Type</th></tr></thead>
          <tbody>{shown.map((r) => <tr key={r.id}><td>{r.title}</td><td>{r.client}</td><td>{r.location}</td><td>{r.year}</td><td><span className="pill">{r.type}</span></td></tr>)}</tbody>
        </table></div>
      </div></section>

      <section className="section tight"><div className="wrap">
        <div className="sec-title"><span className="eyebrow">Working relations</span><h2>Memberships</h2></div>
        <div className="grid g2">
          <div className="vm reveal"><h3>NEMA</h3><p>Registered with the National Environment Management Authority, with NEMA-registered Lead Experts on the team.</p></div>
          <div className="vm reveal"><h3>Kenya Rainwater Association</h3><p>Member of the Kenya Rainwater Association, supporting rainwater harvesting and water security.</p></div>
        </div>
      </div></section>
    </>
  );
}
