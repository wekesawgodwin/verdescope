import { useEffect, useState } from 'react';
import type { Media } from '../lib/types';
import { Icon } from './Icon';

const ytId = (u: string) => u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1];

export function Lightbox({ items, start, onClose }: { items: Media[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const n = items.length;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((x) => (x + 1) % n);
      if (e.key === 'ArrowLeft') setI((x) => (x - 1 + n) % n);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [n, onClose]);

  const m = items[i];
  const yt = m.type === 'video' ? ytId(m.src) : undefined;
  return (
    <div className="lightbox open" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <button className="lb-btn lb-close" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
      {n > 1 && <button className="lb-btn lb-prev" aria-label="Previous" onClick={() => setI((i - 1 + n) % n)}><Icon name="arrowL" /></button>}
      <figure key={i}>
        {m.type === 'video'
          ? yt
            ? <iframe src={`https://www.youtube.com/embed/${yt}?autoplay=1`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen title={m.caption || 'Video'} />
            : <video src={m.src} controls autoPlay playsInline poster={m.poster || undefined} />
          : <img src={m.src} alt={m.caption || ''} />}
        <figcaption>{m.caption}{m.credit && <small>Photo: {m.credit}</small>}<small>{i + 1} / {n}</small></figcaption>
      </figure>
      {n > 1 && <button className="lb-btn lb-next" aria-label="Next" onClick={() => setI((i + 1) % n)}><Icon name="arrowR" /></button>}
    </div>
  );
}
