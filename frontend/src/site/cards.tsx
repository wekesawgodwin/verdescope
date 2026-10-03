import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import type { Post, Service } from '../lib/types';

export function PostCard({ p }: { p: Post }) {
  const d = new Date(p.date);
  return (
    <Link className="post-card reveal" to={`/blog/${p.slug}`}>
      <div className="thumb">
        <img src={p.image} alt="" loading="lazy" />
        <div className="date"><b>{d.getDate()}</b><small>{d.toLocaleString('en', { month: 'short' })} {d.getFullYear()}</small></div>
      </div>
      <div className="body">
        <span className="tag">{p.category}</span><h3>{p.title}</h3><p>{p.excerpt}</p>
        <span className="link-arrow">Read more <Icon name="arrowR" /></span>
      </div>
    </Link>
  );
}

export function ServiceCard({ s }: { s: Service }) {
  return (
    <div className="svc reveal">
      <span className="num">{s.num}</span>
      <div className="ico"><Icon name={s.icon} /></div>
      <h3>{s.title}</h3>
      <p>{s.summary}</p>
      <Link className="link-arrow" to={`/services#svc-${s.id}`}>Discover <Icon name="arrowR" /></Link>
    </div>
  );
}

export const Skeleton = ({ h = 260, n = 3 }: { h?: number; n?: number }) => (
  <>{Array.from({ length: n }, (_, i) => <div key={i} className="skeleton" style={{ minHeight: h }} />)}</>
);
