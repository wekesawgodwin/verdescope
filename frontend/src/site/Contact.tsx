import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { api } from '../lib/api';
import { PageHead, useSite } from './SiteLayout';

export default function Contact() {
  const site = useSite();
  const [params] = useSearchParams();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const s = site?.settings;
  const tel = (p: string) => 'tel:' + p.replace(/\s/g, '');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true); setErr('');
    try {
      await api('/public/inquiries', { method: 'POST', body: Object.fromEntries(new FormData(form)) });
      form.reset(); setSent(true);
    } catch (x) { setErr((x as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageHead title="Contact Us" img="/assets/img/stock/hero-mara.jpg" crumb="Contact" />
      <section className="section"><div className="wrap contact-grid">
        <div className="reveal">
          <span className="eyebrow">Get in touch</span>
          <h2 style={{ fontSize: 'clamp(28px,3vw,38px)', fontWeight: 300 }}>Let’s talk about your <b style={{ color: 'var(--accent)', fontWeight: 500 }}>project</b></h2>
          <div className="info-item"><div className="ic"><Icon name="pin" /></div><div><h4>Office</h4><p>{s?.address}</p></div></div>
          <div className="info-item"><div className="ic"><Icon name="phone" /></div><div><h4>Phone</h4>{s && <p><a href={tel(s.phone1)}>{s.phone1}</a><br /><a href={tel(s.phone2)}>{s.phone2}</a></p>}</div></div>
          <div className="info-item"><div className="ic"><Icon name="mail" /></div><div><h4>Email</h4>{s && <p><a href={`mailto:${s.public_email}`}>{s.public_email}</a></p>}</div></div>
          <div className="info-item"><div className="ic"><Icon name="clock" /></div><div><h4>Hours</h4><p>Monday – Friday, 8:00am – 5:00pm</p></div></div>
        </div>
        <div className="reveal">
          <form className="form" onSubmit={submit}>
            <div className="field"><label htmlFor="name">Full name *</label><input id="name" name="name" required autoComplete="name" /></div>
            <div className="field"><label htmlFor="email">Email *</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
            <div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" autoComplete="tel" /></div>
            <div className="field"><label htmlFor="org">Organisation</label><input id="org" name="org" autoComplete="organization" /></div>
            <div className="field full"><label htmlFor="service">Service of interest</label>
              <select id="service" name="service" defaultValue={params.get('service') || ''} key={site ? 'ready' : 'loading'}>
                <option value="">Select a service…</option>
                {site?.services.map((x) => <option key={x.id}>{x.title}</option>)}
                <option>General inquiry</option>
              </select>
            </div>
            <div className="field full"><label htmlFor="subject">Subject</label><input id="subject" name="subject" /></div>
            <div className="field full"><label htmlFor="message">Message *</label><textarea id="message" name="message" required placeholder="Tell us about the project, location and timelines…" /></div>
            {/* Honeypot: hidden from people, filled in by bots */}
            <input name="website" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: -9999, width: 1, height: 1 }} aria-hidden="true" />
            <div className="full"><button className="btn solid" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send inquiry'}</button></div>
            {err && <div className="full" style={{ color: 'var(--danger)' }} role="alert">{err}</div>}
            <div className={'notice full' + (sent ? ' show' : '')} role="status"><Icon name="check" /><div><b>Thank you, your inquiry has been received.</b><br /><span style={{ color: 'var(--muted)' }}>Our team will respond by email within one business day.</span></div></div>
          </form>
        </div>
      </div></section>
      <iframe className="map" title="Office location map" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=36.8030%2C-1.2790%2C36.8190%2C-1.2650&layer=mapnik&marker=-1.2722%2C36.8108" />
    </>
  );
}
