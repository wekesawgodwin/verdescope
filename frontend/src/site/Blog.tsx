import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useApi } from '../lib/api';
import type { Post } from '../lib/types';
import { PostCard, Skeleton } from './cards';
import { PageHead } from './SiteLayout';

export default function Blog() {
  const { data: posts, error } = useApi<Post[]>('/public/posts');
  const [params, setParams] = useSearchParams();
  const cat = params.get('cat') || '';
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');

  const cats = useMemo(() => {
    const c: Record<string, number> = {};
    (posts ?? []).forEach((p) => { c[p.category] = (c[p.category] || 0) + 1; });
    return Object.entries(c);
  }, [posts]);
  const shown = (posts ?? []).filter((p) => (!cat || p.category === cat) && (!query || (p.title + p.excerpt + p.body).toLowerCase().includes(query)));
  const pick = (c: string) => setParams(c ? { cat: c } : {});

  return (
    <>
      <PageHead title="Blog & Insights" img="/assets/img/stock/mau-inside.jpg" crumb="Blog" />
      <section className="section"><div className="wrap blog-layout">
        <div className="grid g2" style={{ alignContent: 'start' }}>
          {error && <div className="error-box" style={{ gridColumn: '1/-1' }}>{error}</div>}
          {!posts && !error && <Skeleton h={420} n={2} />}
          {posts && (shown.length ? shown.map((p) => <PostCard key={p.id} p={p} />) : <div className="empty" style={{ gridColumn: '1/-1' }}>No articles found.</div>)}
        </div>
        <aside className="sidebar">
          <div className="widget"><h4>Search</h4>
            <form className="search" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim().toLowerCase()); }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles…" aria-label="Search articles" />
              <button aria-label="Search"><Icon name="search" /></button>
            </form>
          </div>
          <div className="widget"><h4>Categories</h4>
            <ul>
              <li className={!cat ? 'active' : ''} onClick={() => pick('')}><span>All articles</span><span>{posts?.length ?? ''}</span></li>
              {cats.map(([c, n]) => <li key={c} className={cat === c ? 'active' : ''} onClick={() => pick(c)}><span>{c}</span><span>{n}</span></li>)}
            </ul>
          </div>
          <div className="widget"><h4>Recent posts</h4><ul>{(posts ?? []).slice(0, 4).map((p) => <li key={p.id}><Link to={`/blog/${p.slug}`}>{p.title}</Link></li>)}</ul></div>
        </aside>
      </div></section>
    </>
  );
}
