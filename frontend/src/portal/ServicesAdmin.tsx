import { useState } from 'react';
import { Icon } from '../components/Icon';
import { api, useApi } from '../lib/api';
import type { Service } from '../lib/types';
import { ErrorBox, ImagePicker, Loading, Modal, useToast } from './ui';

export default function ServicesAdmin() {
  const { data, error, reload } = useApi<Service[]>('/services');
  const [edit, setEdit] = useState<Service | null>(null);
  const toast = useToast();
  if (error) return <ErrorBox msg={error} />;
  return (
    <>
      <div className="toolbar"><span style={{ color: 'var(--muted)' }}>Edit the service areas shown on the homepage and Services page.</span><span className="sp" />
        <a className="btn" href="/services" target="_blank" rel="noreferrer"><Icon name="eye" /> View page</a></div>
      {!data ? <Loading /> : (
        <div className="card">{data.map((s) => (
          <div className="list-item" key={s.id}>
            <img className="thumb-sm" src={s.image} alt="" style={{ width: 80, height: 56 }} />
            <div className="grow"><div className="t"><span style={{ color: 'var(--accent)', fontFamily: 'var(--head)' }}>{s.num}</span>&nbsp; {s.title}</div>
              <div className="s">{s.summary}</div><div className="s" style={{ marginTop: 4 }}>{s.items.length} sub-services</div></div>
            <button className="btn sm" onClick={() => setEdit(s)}><Icon name="edit" /> Edit</button>
          </div>
        ))}</div>
      )}
      {edit && (
        <Modal title="Edit service" wide onClose={() => setEdit(null)} onSubmit={async (fd) => {
          const items = String(fd.get('items')).split('\n').map((x) => x.trim()).filter(Boolean);
          await api(`/services/${edit.id}`, { method: 'PUT', body: { title: fd.get('title'), summary: fd.get('summary'), image: fd.get('image'), items } });
          toast('Service updated'); reload();
        }}>
          <div className="field"><label>Title</label><input name="title" required defaultValue={edit.title} /></div>
          <div className="field"><label>Summary</label><textarea name="summary" style={{ minHeight: 70 }} required defaultValue={edit.summary} /></div>
          <div className="field"><label>Sub-services (one per line)</label><textarea name="items" style={{ minHeight: 140 }} defaultValue={edit.items.join('\n')} /></div>
          <ImagePicker name="image" value={edit.image} label="Image" />
        </Modal>
      )}
    </>
  );
}
