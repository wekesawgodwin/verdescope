import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useApi } from '../lib/api';
import { fmtDate, Markdown } from '../lib/format';
import type { Post } from '../lib/types';
import { PostCard } from './cards';

export default function PostPage() {
  const { slug } = useParams();
  const { data: p, error, loading } = useApi<Post>(`/public/posts/${slug}`);
  const { data: more } = useApi<Post[]>('/public/posts?limit=4');
  useEffect(() => { if (p) document.title = `${p.title} — Verde-Scope Africa`; }, [p]);

  return (
    <>
      <section className="page-head" style={{ backgroundImage: `url('${p?.image || '/assets/img/stock/mau-inside.jpg'}')` }}><div className="wrap">
        <span className="eyebrow">Insights</span>
        <h1 style={{ fontSize: 'clamp(28px,4vw,52px)', maxWidth: 900 }}>{p?.title ?? (loading ? '' : 'Article')}</h1>
        <div className="crumbs"><Link to="/">Home</Link> / <Link to="/blog">Blog</Link> / <span>Article</span></div>
      </div></section>
      <section className="section" style={{ paddingTop: 60 }}><div className="wrap"><article className="article">
        {error && <div className="empty">This article could not be found. <Link className="link-arrow" to="/blog">Back to blog</Link></div>}
        {p && <>
          <img className="hero-img" src={p.image} alt="" />
          <div className="meta"><span>{fmtDate(p.date, { day: 'numeric', month: 'long', year: 'numeric' })}</span><span>{p.author}</span><Link className="tag" to={`/blog?cat=${encodeURIComponent(p.category)}`}>{p.category}</Link></div>
          <div className="content"><Markdown src={p.body} /></div>
          <div className="cta" style={{ marginTop: 50 }}><div><h2>Have a similar project?</h2><p>Talk to our experts about your requirements.</p></div><Link className="btn" to="/contact">Contact us <Icon name="arrowR" /></Link></div>
        </>}
      </article></div></section>
      <section className="section alt"><div className="wrap">
        <div className="sec-title"><span className="eyebrow">Keep reading</span><h2>More <b>Articles</b></h2></div>
        <div className="grid g3">{(more ?? []).filter((x) => x.slug !== slug).slice(0, 3).map((x) => <PostCard key={x.id} p={x} />)}</div>
      </div></section>
    </>
  );
}
