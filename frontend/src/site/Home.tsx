import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Lightbox } from '../components/Lightbox';
import { useApi } from '../lib/api';
import type { Post } from '../lib/types';
import { PostCard, ServiceCard, Skeleton } from './cards';
import { useSite } from './SiteLayout';

const SLIDES = [
  { img: '/assets/img/stock/hero-mara.jpg', eyebrow: 'Environmental & Development Consultancy', a: 'Sustainable', b: 'Solutions', c: 'for Africa',
    text: 'Evidence-based environmental compliance, climate resilience and natural resource management for governments, development partners and the private sector.' },
  { img: '/assets/img/stock/mau-forest.jpg', eyebrow: 'Natural Resources · WASH · IWRM', a: 'Resilient', b: 'Ecosystems', c: '',
    text: 'From watershed management to ecosystem restoration, we help protect the water towers and landscapes that sustain livelihoods.' },
  { img: '/assets/img/projects/community-baraza.jpg', eyebrow: 'Research · M&E · Capacity Building', a: 'Thriving', b: 'Communities', c: '',
    text: 'Meaningful stakeholder engagement, rigorous research and training that leave institutions and communities stronger.' },
];

const FEATURED = [
  { img: '/assets/img/projects/pump-house.jpg', cat: 'Water & Irrigation', t: 'Irrigation & water distribution supervision' },
  { img: '/assets/img/stock/samburu-arid.jpg', cat: 'ASAL Resilience', t: 'Design & supervision of 15 sand dams, Kajiado' },
  { img: '/assets/img/stock/tana-sunset.jpg', cat: 'ESIA', t: 'ESIA of floating jetty, Shimoni — KMFRI / World Bank' },
  { img: '/assets/img/projects/community-baraza.jpg', cat: 'Public Participation', t: 'Community consultations for ESIA studies' },
];

const CLIENTS: [string, string][] = [
  ['gov', 'County Governments'], ['gov', 'National Government'], ['globe', 'Development Partners'], ['heart', 'Public Benefit Organisations'],
  ['hospital', 'Hospitals & Health Centres'], ['school', 'Universities'], ['building', 'Private Sector'], ['drop', 'Water User Associations'],
];

function Hero() {
  const [cur, setCur] = useState(0);
  const [tick, setTick] = useState(0); // restarts the auto-advance timer and progress bar
  useEffect(() => {
    const t = setTimeout(() => setCur((c) => (c + 1) % SLIDES.length), 6500);
    return () => clearTimeout(t);
  }, [cur, tick]);
  const go = (d: number) => { setCur((c) => (c + d + SLIDES.length) % SLIDES.length); setTick((t) => t + 1); };
  return (
    <section className="hero" aria-label="Highlights">
      {SLIDES.map((s, i) => (
        <div key={i} className={'slide' + (i === cur ? ' active' : '')} aria-hidden={i !== cur}>
          <div className="slide-bg" style={{ backgroundImage: `url('${s.img}')` }} />
          <div className="slide-content wrap"><div className="inner">
            <span className="eyebrow">{s.eyebrow}</span>
            <h1>{s.a} <b>{s.b}</b> {s.c}</h1>
            <p>{s.text}</p>
            <div><Link className="btn" to="/services">Discover our services <Icon name="arrowR" /></Link></div>
          </div></div>
        </div>
      ))}
      <div className="hero-ui"><div className="wrap">
        <div className="counter"><b>{String(cur + 1).padStart(2, '0')}</b><i key={`${cur}-${tick}`} /><span>0{SLIDES.length}</span></div>
        <div className="arrows">
          <button aria-label="Previous slide" onClick={() => go(-1)}><Icon name="arrowL" /></button>
          <button aria-label="Next slide" onClick={() => go(1)}><Icon name="arrowR" /></button>
        </div>
      </div></div>
      <div className="scroll-cue" />
    </section>
  );
}

export default function Home() {
  const site = useSite();
  const { data: posts } = useApi<Post[]>('/public/posts?limit=3');
  const [reel, setReel] = useState(false);
  const services = site?.services ?? [];

  return (
    <>
      <Hero />

      <section className="section" id="about">
        <div className="wrap split">
          <div className="about-img reveal">
            <img src="/assets/img/projects/pump-house.jpg" alt="Water project supervised by Verde-Scope" />
            <div className="badge"><b>15</b><span>Years in practice</span></div>
          </div>
          <div className="reveal">
            <span className="eyebrow">About Verde-Scope</span>
            <h2 style={{ fontSize: 'clamp(30px,3.6vw,46px)', fontWeight: 300 }}>Bridging science, policy &amp; <b style={{ color: 'var(--accent)', fontWeight: 500 }}>development practice</b></h2>
            <p>Verde-Scope Africa Limited, previously registered as Smart Consulting Limited, is a multidisciplinary environmental and development consultancy providing innovative, evidence-based and sustainable solutions across Africa.</p>
            <p>We bring together environmental experts, GIS specialists, researchers, economists, engineers, social scientists and M&amp;E professionals to serve governments, development partners, NGOs, UN agencies, research institutions, the private sector and local communities.</p>
            <ul className="checks">
              <li>Registered with NEMA, with NEMA-registered Lead Experts</li>
              <li>Member of the Kenya Rainwater Association</li>
              <li>Serving clients across Kenya and the region since 2011</li>
            </ul>
            <Link className="btn" to="/about">More about us <Icon name="arrowR" /></Link>
          </div>
        </div>
      </section>

      <section style={{ padding: '0 0 40px' }}><div className="wrap stats reveal">
        <div className="stat"><b>2011</b><span>Serving clients since</span></div>
        <div className="stat"><b>80<em>+</em></b><span>Key assignments</span></div>
        <div className="stat"><b>10<em>+</em></b><span>Counties reached</span></div>
        <div className="stat"><b>{services.length || 5}</b><span>Core service areas</span></div>
      </div></section>

      <section className="section alt">
        <div className="wrap">
          <div className="sec-title row"><div><span className="eyebrow">What we do</span><h2>Our <b>Services</b></h2></div><Link className="link-arrow" to="/services">All services <Icon name="arrowR" /></Link></div>
          <div className="grid g3">{site ? services.slice(0, 3).map((s) => <ServiceCard key={s.id} s={s} />) : <Skeleton />}</div>
          <div className="grid g3" style={{ marginTop: 30 }}>
            {services.slice(3).map((s) => <ServiceCard key={s.id} s={s} />)}
            <div className="svc reveal dark-ctx" style={{ justifyContent: 'center', background: 'var(--forest)' }}>
              <h3>Need a tailored team?</h3>
              <p style={{ color: 'var(--muted)' }}>Our experts combine environmental science, engineering, economics, GIS and social science.</p>
              <Link className="btn" to="/contact">Talk to us <Icon name="arrowR" /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="sec-title row"><div><span className="eyebrow">Track record</span><h2>Recent <b>Work</b></h2></div><Link className="link-arrow" to="/about#record">Key assignments <Icon name="arrowR" /></Link></div>
          <div className="grid g4">
            {FEATURED.map((p) => <Link key={p.t} className="pcard reveal" to="/gallery"><img src={p.img} alt="" loading="lazy" /><div className="cap"><small>{p.cat}</small><h3>{p.t}</h3></div></Link>)}
          </div>
        </div>
      </section>

      <section className="banner" style={{ backgroundImage: "url('/assets/img/stock/hero-sunset.jpg')" }}>
        <div className="wrap reveal">
          <button className="play" onClick={() => setReel(true)} aria-label="Play field highlights video"><Icon name="play" /></button>
          <h2>To become Africa’s leading consultancy for <b>resilient ecosystems</b>, thriving communities and sustainable economies</h2>
          <span className="eyebrow" style={{ margin: 0 }}>Our vision</span>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="sec-title row"><div><span className="eyebrow">Insights</span><h2>Latest <b>News</b></h2></div><Link className="link-arrow" to="/blog">Visit the blog <Icon name="arrowR" /></Link></div>
          <div className="grid g3">{posts ? posts.map((p) => <PostCard key={p.id} p={p} />) : <Skeleton h={420} />}</div>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <div className="sec-title center"><span className="eyebrow">Who we serve</span><h2>Clients &amp; <b>Partners</b></h2></div>
          <div className="clients reveal">{CLIENTS.map(([ic, t]) => <div key={t}><Icon name={ic} />{t}</div>)}</div>
        </div>
      </section>

      <section className="section tight"><div className="wrap">
        <div className="cta reveal"><div><h2>Planning a project that needs environmental approval?</h2><p>Tell us about it and our team will respond within one business day.</p></div>
          <Link className="btn solid" to="/contact">Send an inquiry</Link></div>
      </div></section>

      {reel && <Lightbox items={[{ type: 'video', src: '/assets/video/field-highlights.mp4', poster: '/assets/video/field-highlights.jpg', caption: 'Verde-Scope field highlights' }]} start={0} onClose={() => setReel(false)} />}
    </>
  );
}
