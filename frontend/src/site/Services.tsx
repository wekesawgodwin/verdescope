import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ServiceCard, Skeleton } from './cards';
import { PageHead, useSite } from './SiteLayout';

export default function Services() {
  const site = useSite();
  const { hash } = useLocation();
  useEffect(() => { if (site && hash) document.getElementById(hash.slice(1))?.scrollIntoView(); }, [site, hash]);

  return (
    <>
      <PageHead title="Our Services" img="/assets/img/stock/mau-spring.jpg" crumb="Services" />
      <section className="section"><div className="wrap">
        <div className="sec-title"><span className="eyebrow">Areas of expertise</span><h2>Core Service <b>Areas</b></h2>
          <p style={{ maxWidth: 760, marginTop: 18 }}>We combine scientific knowledge, technical expertise and practical field experience to support governments, development partners, private sector organisations, NGOs, UN agencies, financial institutions and local communities in achieving sustainable development outcomes.</p></div>
        <div className="grid g3">{site ? site.services.map((s) => <ServiceCard key={s.id} s={s} />) : <Skeleton />}</div>
      </div></section>

      <section className="section alt" style={{ paddingTop: 60 }}><div className="wrap">
        {site?.services.map((s) => (
          <div className="svc-detail reveal" id={`svc-${s.id}`} key={s.id}>
            <div className="svc-media"><span className="num">{s.num}</span><img src={s.image} alt="" loading="lazy" /></div>
            <div>
              <span className="eyebrow">Service {s.num}</span>
              <h2 style={{ fontSize: 'clamp(26px,3vw,36px)', fontWeight: 300 }}>{s.title}</h2>
              <p>{s.summary}</p>
              <ul>{s.items.map((i) => <li key={i}><Icon name="check" /><span>{i}</span></li>)}</ul>
              <Link className="btn" to={`/contact?service=${encodeURIComponent(s.title)}`}>Request this service <Icon name="arrowR" /></Link>
            </div>
          </div>
        ))}
      </div></section>

      <section className="section tight"><div className="wrap">
        <div className="cta reveal"><div><h2>Not sure which service you need?</h2><p>Describe your project and we will recommend the right scope and team.</p></div><Link className="btn solid" to="/contact">Get in touch</Link></div>
      </div></section>
    </>
  );
}
