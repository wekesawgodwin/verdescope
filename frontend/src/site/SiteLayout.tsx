import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useInstall } from '../components/useInstall';
import { api, useApi } from '../lib/api';
import type { SiteData } from '../lib/types';

const SiteCtx = createContext<SiteData | null>(null);
/** Public site content (settings, services, expertise, assignments); null while loading. */
export const useSite = () => useContext(SiteCtx);

const NAV: [string, string][] = [['/', 'Home'], ['/about', 'About'], ['/services', 'Services'], ['/gallery', 'Gallery'], ['/blog', 'Blog'], ['/contact', 'Contact']];

export default function SiteLayout() {
  const { data } = useApi<SiteData>('/public/site');
  const loc = useLocation();
  const root = useRef<HTMLDivElement>(null);
  const [solid, setSolid] = useState(false);
  const [menu, setMenu] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const install = useInstall();

  useEffect(() => {
    const onScroll = () => { setSolid(window.scrollY > 60); setShowTop(window.scrollY > 600); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Route change: close menu, scroll to top (or #hash), record a page view
  useEffect(() => {
    setMenu(false);
    if (loc.hash) setTimeout(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView(), 120);
    else window.scrollTo(0, 0);
    const page = loc.pathname.split('/')[1] || 'home';
    api('/public/track', { method: 'POST', body: { page } }).catch(() => {});
  }, [loc.pathname, loc.hash]);

  // Mobile menu open: lock page scroll and close on Escape
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [menu]);

  // Scroll-reveal for any .reveal element, including ones rendered after data loads
  useEffect(() => {
    const el = root.current!;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    const scan = () => el.querySelectorAll('.reveal:not(.in)').forEach((n) => io.observe(n));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(el, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);

  const s = data?.settings;
  const tel = (p: string) => 'tel:' + p.replace(/\s/g, '');

  return (
    <SiteCtx.Provider value={data}>
      <div className="site" ref={root}>
        {s?.maintenance && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, background: '#7cb82f', color: '#0a120d', textAlign: 'center', fontSize: 13, padding: 6 }}>Site in maintenance mode — some content may be updating.</div>}
        <header className={'site-header' + (solid ? ' solid' : '')}>
          <div className="wrap">
            <Link className="brand" to="/" aria-label="Verde-Scope Africa home">
              <img src="/assets/img/brand/logo-emblem-light.png" alt="" />
              <span className="brand-text"><b>VERDE-<span>SCOPE</span></b><small>AFRICA LIMITED</small></span>
            </Link>
            {menu && <div className="nav-backdrop" aria-hidden="true" onClick={() => setMenu(false)} />}
            <nav className={'nav' + (menu ? ' open' : '')} id="nav">
              {NAV.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>)}
              <Link to="/portal" className="btn-portal">Portal</Link>
            </nav>
            <button className={'burger' + (menu ? ' open' : '')} aria-label={menu ? 'Close menu' : 'Open menu'} aria-controls="nav" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <Icon name={menu ? 'close' : 'menu'} />
            </button>
          </div>
        </header>

        <Outlet />

        <footer className="site-footer">
          <div className="wrap foot-grid">
            <div>
              <img className="foot-logo" src="/assets/img/brand/logo-full-light.png" alt="Verde-Scope Africa Limited" />
              <p>A multidisciplinary environmental and development consultancy providing innovative, evidence-based and sustainable solutions across Africa since 2011.</p>
              <div className="socials">
                <a href="#" aria-label="LinkedIn"><Icon name="linkedin" /></a>
                <a href="#" aria-label="Facebook"><Icon name="facebook" /></a>
                <a href="#" aria-label="X"><Icon name="xlogo" /></a>
              </div>
              {install && <button className="btn install-btn" style={{ marginTop: 20 }} onClick={install}><Icon name="download" /> Install app</button>}
            </div>
            <div>
              <h4>Explore</h4>
              <ul>{NAV.map(([to, l]) => <li key={to}><Link to={to}>{l}</Link></li>)}<li><Link to="/portal">Client &amp; Staff Portal</Link></li></ul>
            </div>
            <div>
              <h4>Services</h4>
              <ul>{data?.services.map((x) => <li key={x.id}><Link to={`/services#svc-${x.id}`}>{x.title}</Link></li>)}</ul>
            </div>
            <div>
              <h4>Contact</h4>
              {s && <ul>
                <li>{s.address}</li>
                <li>{s.postal}</li>
                <li><a href={tel(s.phone1)}>{s.phone1}</a> · <a href={tel(s.phone2)}>{s.phone2}</a></li>
                <li><a href={`mailto:${s.public_email}`}>{s.public_email}</a></li>
              </ul>}
            </div>
          </div>
          <div className="wrap foot-bottom">
            <span>© {new Date().getFullYear()} Verde-Scope Africa Limited. Registered with NEMA · Member, Kenya Rainwater Association.</span>
            <span>Some landscape photography via Wikimedia Commons (CC BY / BY-SA) — credited in the gallery.</span>
          </div>
        </footer>
        <button className={'to-top' + (showTop ? ' show' : '')} aria-label="Back to top" onClick={() => window.scrollTo({ top: 0 })}><Icon name="up" /></button>
      </div>
    </SiteCtx.Provider>
  );
}

export function PageHead({ title, img, crumb, eyebrow = 'Verde-Scope Africa' }: { title: string; img: string; crumb: string; eyebrow?: string }) {
  return (
    <section className="page-head" style={{ backgroundImage: `url('${img}')` }}>
      <div className="wrap">
        <span className="eyebrow">{eyebrow}</span><h1>{title}</h1>
        <div className="crumbs"><Link to="/">Home</Link> / <span>{crumb}</span></div>
      </div>
    </section>
  );
}
