import { useState } from 'react';
import { Icon } from '../components/Icon';
import { api, useApi } from '../lib/api';
import { fmtDate, today } from '../lib/format';
import type { GalleryEvent, Media } from '../lib/types';
import { ErrorBox, Loading, Modal, useToast } from './ui';

const ytId = (u: string) => u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1];

export default function GalleryAdmin() {
  const { data: events, error, reload } = useApi<GalleryEvent[]>('/events');
  const [edit, setEdit] = useState<GalleryEvent | 'new' | null>(null);
  const toast = useToast();
  async function del(e: GalleryEvent) {
    if (!confirm(`Delete event “${e.title}” and its media?`)) return;
    await api(`/events/${e.id}`, { method: 'DELETE' }); toast('Event deleted'); reload();
  }
  if (error) return <ErrorBox msg={error} />;
  return (
    <>
      <div className="toolbar"><span style={{ color: 'var(--muted)' }}>Photos and videos are grouped by event on the public gallery page.</span><span className="sp" />
        <a className="btn" href="/gallery" target="_blank" rel="noreferrer"><Icon name="eye" /> View gallery</a>
        <button className="btn primary" onClick={() => setEdit('new')}><Icon name="plus" /> New event</button></div>
      {!events ? <Loading /> : (
        <div className="grid g3">{events.map((e) => {
          const cover = e.media.find((m) => m.type === 'image') ?? e.media[0];
          const nP = e.media.filter((m) => m.type === 'image').length, nV = e.media.length - nP;
          return (
            <div className="ev-card" key={e.id}>
              <div className="cover">{cover && <img src={(cover.type === 'video' ? cover.poster : cover.src) || undefined} alt="" />}{e.sample && <span className="st warn">Sample imagery</span>}</div>
              <div className="bd"><h4>{e.title}</h4><small>{fmtDate(e.date)} · {e.location} · {e.category}</small></div>
              <div className="ft"><span>{nP} photo{nP === 1 ? '' : 's'} · {nV} video{nV === 1 ? '' : 's'}</span>
                <span><button className="icon-btn" title="Edit" onClick={() => setEdit(e)}><Icon name="edit" /></button><button className="icon-btn danger" title="Delete" onClick={() => del(e)}><Icon name="trash" /></button></span></div>
            </div>
          );
        })}</div>
      )}
      {edit && <EventEditor ev={edit === 'new' ? null : edit} categories={[...new Set((events ?? []).map((e) => e.category))]} onClose={() => setEdit(null)} onSaved={reload} />}
    </>
  );
}

function EventEditor({ ev, categories, onClose, onSaved }: { ev: GalleryEvent | null; categories: string[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [media, setMedia] = useState<Media[]>(ev ? ev.media.map((m) => ({ ...m })) : []);
  const [uploading, setUploading] = useState(0);
  const [vid, setVid] = useState('');
  const e0 = ev ?? { title: '', date: today(), location: '', category: '', description: '', sample: false };

  async function upload(files: FileList) {
    for (const f of Array.from(files)) {
      setUploading((n) => n + 1);
      try {
        const fd = new FormData(); fd.append('file', f);
        const r = await api<{ type: 'image' | 'video'; url: string }>('/uploads', { method: 'POST', form: fd });
        setMedia((m) => [...m, { type: r.type, src: r.url, caption: f.name.replace(/\.\w+$/, '').replace(/[-_]/g, ' ') }]);
      } catch (e) { toast(`${f.name}: ${(e as Error).message}`, true); }
      finally { setUploading((n) => n - 1); }
    }
  }
  function addVideoLink() {
    const u = vid.trim(); if (!u) return;
    const id = ytId(u);
    setMedia((m) => [...m, { type: 'video', src: u, poster: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '', caption: 'Video' }]);
    setVid('');
  }
  const setCaption = (i: number, caption: string) => setMedia((m) => m.map((x, j) => (j === i ? { ...x, caption } : x)));
  const move = (i: number, d: number) => setMedia((m) => { const a = [...m]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });

  return (
    <Modal title={ev ? 'Edit event' : 'New gallery event'} wide saveLabel={ev ? 'Save event' : 'Create event'} onClose={onClose} onSubmit={async (fd) => {
      if (uploading) throw new Error('Please wait for uploads to finish.');
      if (!media.length && !confirm('This event has no photos or videos yet. Save anyway?')) return false;
      const body = { ...Object.fromEntries(fd), sample: e0.sample, media };
      await api(ev ? `/events/${ev.id}` : '/events', { method: ev ? 'PUT' : 'POST', body });
      toast(ev ? 'Event updated' : 'Event created'); onSaved();
    }}>
      <div className="field"><label>Event title</label><input name="title" required defaultValue={e0.title} /></div>
      <div className="row3">
        <div className="field"><label>Date</label><input type="date" name="date" required defaultValue={e0.date} /></div>
        <div className="field"><label>Location</label><input name="location" required defaultValue={e0.location} /></div>
        <div className="field"><label>Category</label><input name="category" list="evCats" required defaultValue={e0.category} /><datalist id="evCats">{categories.map((c) => <option key={c} value={c} />)}</datalist></div>
      </div>
      <div className="field"><label>Description</label><textarea name="description" style={{ minHeight: 70 }} defaultValue={e0.description} /></div>
      <div className="field"><label>Photos &amp; videos ({media.length}){uploading > 0 && ` · uploading ${uploading}…`}</label>
        <div className="media-edit">
          {media.map((x, i) => (
            <div className="mi" key={x.src + i}>
              <div className="pv">
                {x.type === 'video'
                  ? x.poster ? <img src={x.poster} alt="" /> : <video src={x.src} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <img src={x.src} alt="" />}
                {x.type === 'video' && <span className="vt">VIDEO</span>}
                <button type="button" className="icon-btn danger rm" title="Remove" onClick={() => setMedia((m) => m.filter((_, j) => j !== i))}><Icon name="close" /></button>
              </div>
              <div style={{ display: 'flex' }}>
                <input placeholder="Caption" value={x.caption || ''} onChange={(e) => setCaption(i, e.target.value)} aria-label="Caption" />
                <button type="button" className="icon-btn" title="Move earlier" onClick={() => move(i, -1)} style={{ width: 26 }}><Icon name="arrowL" size={13} /></button>
                <button type="button" className="icon-btn" title="Move later" onClick={() => move(i, 1)} style={{ width: 26 }}><Icon name="arrowR" size={13} /></button>
              </div>
            </div>
          ))}
          {!media.length && <div className="empty" style={{ gridColumn: '1/-1', padding: 16 }}>No media yet. The first item is the event cover.</div>}
        </div>
      </div>
      <div className="row2">
        <label className="drop"><Icon name="image" /><b>Upload photos or videos</b><small>JPG, PNG, WebP · MP4/WebM up to 100 MB</small>
          <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple hidden onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = ''; }} /></label>
        <div className="drop" style={{ cursor: 'default' }}><Icon name="video" /><b>Add a YouTube link</b>
          <div style={{ display: 'flex', gap: 6, width: '100%' }}>
            <input className="inp" value={vid} onChange={(e) => setVid(e.target.value)} placeholder="https://youtu.be/…" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVideoLink(); } }} />
            <button type="button" className="btn sm" onClick={addVideoLink}>Add</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
