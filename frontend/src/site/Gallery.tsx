import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Lightbox } from '../components/Lightbox';
import { useApi } from '../lib/api';
import type { GalleryEvent, Media } from '../lib/types';
import { Skeleton } from './cards';
import { PageHead } from './SiteLayout';

export default function Gallery() {
  const { data: events, error } = useApi<GalleryEvent[]>('/public/events');
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState<{ items: Media[]; i: number } | null>(null);

  const list = events ?? [];
  const cats = useMemo(() => [...new Set(list.map((e) => e.category))], [list]);
  const years = useMemo(() => [...new Set(list.map((e) => e.date.slice(0, 4)))], [list]);
  const shown = list.filter((e) => filter === 'all' || (filter === 'video' && e.media.some((m) => m.type === 'video')) || filter === 'c:' + e.category || filter === 'y:' + e.date.slice(0, 4));
  const chips: [string, string][] = [['all', 'All events'], ['video', 'Videos'], ...cats.map((c): [string, string] => ['c:' + c, c]), ...years.map((y): [string, string] => ['y:' + y, y])];

  return (
    <>
      <PageHead title="Gallery" img="/assets/img/stock/tana-sunset.jpg" crumb="Gallery" />
      <section className="section"><div className="wrap">
        <div className="sec-title row"><div><span className="eyebrow">Photos &amp; videos</span><h2>Events &amp; <b>Field Work</b></h2></div>
          <p style={{ maxWidth: 420, margin: 0 }}>Browse photos and videos grouped by event. Click any item to view it full screen.</p></div>
        <div className="filters">{chips.map(([k, l]) => <button key={k} className={'chip' + (filter === k ? ' active' : '')} onClick={() => setFilter(k)}>{l}</button>)}</div>
        {error && <div className="error-box">{error}</div>}
        {!events && !error && <Skeleton h={360} n={2} />}
        {events && !shown.length && <div className="empty">No events match this filter yet.</div>}
        {shown.map((e) => {
          const d = new Date(e.date);
          const media = filter === 'video' ? e.media.filter((m) => m.type === 'video') : e.media;
          const nP = e.media.filter((m) => m.type === 'image').length, nV = e.media.length - nP;
          return (
            <section className="event reveal" id={`event-${e.id}`} key={e.id}>
              <div className="event-head">
                <div className="event-date"><b>{String(d.getDate()).padStart(2, '0')}</b>{d.toLocaleString('en', { month: 'long' })} {d.getFullYear()}</div>
                <div>
                  <h2>{e.title}</h2>
                  <div className="event-meta"><span><Icon name="pin" />{e.location}</span><span><Icon name="folder" />{e.category}</span></div>
                  <p style={{ maxWidth: 720, margin: 0 }}>{e.description}</p>
                </div>
                <span className="count-pill">{nP} photo{nP === 1 ? '' : 's'}{nV ? ` · ${nV} video${nV === 1 ? '' : 's'}` : ''}</span>
              </div>
              <div className="media-grid">
                {media.map((m) => (
                  <button key={m.src} className="m" aria-label={`Open ${m.caption || 'media'}`} onClick={() => setOpen({ items: e.media, i: e.media.indexOf(m) })}>
                    {m.type === 'video'
                      ? m.poster ? <img src={m.poster} alt={m.caption || ''} loading="lazy" /> : <video src={m.src + '#t=1'} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <img src={m.src} alt={m.caption || ''} loading="lazy" />}
                    {m.type === 'video' && <><span className="type">Video</span><span className="vbadge"><span><Icon name="play" /></span></span></>}
                    <span className="mcap">{m.caption}</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div></section>
      {open && <Lightbox items={open.items} start={open.i} onClose={() => setOpen(null)} />}
    </>
  );
}
