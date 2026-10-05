import { useState } from 'react';
import { Icon } from '../components/Icon';
import { api, useApi } from '../lib/api';
import { initials } from '../lib/format';
import type { StaffMember } from '../lib/types';
import { ErrorBox, Loading, Modal, useToast } from './ui';

/** Internal staff directory. Staff are not shown on the public website, which lists sector expertise instead. */
export default function StaffAdmin() {
  const { data: staff, error, reload } = useApi<StaffMember[]>('/staff');
  const [edit, setEdit] = useState<StaffMember | 'new' | null>(null);
  const [q, setQ] = useState('');
  const toast = useToast();

  async function del(m: StaffMember) {
    if (!confirm(`Remove ${m.name} from the staff directory?`)) return;
    try { await api(`/staff/${m.id}`, { method: 'DELETE' }); toast('Staff member removed'); reload(); }
    catch (e) { toast((e as Error).message, true); }
  }
  if (error) return <ErrorBox msg={error} />;
  const shown = (staff ?? []).filter((m) => (m.name + m.role + m.bio).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="toolbar">
        <input className="inp" placeholder="Search staff…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="sp" />
        <button className="btn primary" onClick={() => setEdit('new')}><Icon name="plus" /> Add staff member</button>
      </div>
      <div className="demo-note mb"><Icon name="lock" /><span>Internal only. Staff are not shown on the public website; the About page lists the firm's technical expertise by sector instead.</span></div>
      {!staff ? <Loading /> : (
        <div className="card"><div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Name</th><th>Role / expertise</th><th>Qualifications</th><th>Experience</th><th /></tr></thead>
          <tbody>
            {shown.map((m) => (
              <tr key={m.id}>
                <td><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><span className="avatar">{initials(m.name)}</span><span className="t-title">{m.name}</span></div></td>
                <td>{m.role}</td>
                <td className="t-sub" style={{ maxWidth: 420 }}>{m.bio}</td>
                <td className="t-sub">{m.years ? `${m.years} yrs` : '—'}</td>
                <td className="actions">
                  <button className="icon-btn" title="Edit" onClick={() => setEdit(m)}><Icon name="edit" /></button>
                  <button className="icon-btn danger" title="Remove" onClick={() => del(m)}><Icon name="trash" /></button>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={5} className="empty">No staff found.</td></tr>}
          </tbody>
        </table></div></div>
      )}
      {edit && (
        <Modal title={edit === 'new' ? 'Add staff member' : 'Edit staff member'} saveLabel={edit === 'new' ? 'Add' : 'Save'} onClose={() => setEdit(null)} onSubmit={async (fd) => {
          const body = { ...Object.fromEntries(fd), sort_order: Number(fd.get('sort_order') || 0) };
          await api(edit === 'new' ? '/staff' : `/staff/${edit.id}`, { method: edit === 'new' ? 'POST' : 'PUT', body });
          toast(edit === 'new' ? 'Staff member added' : 'Staff member updated'); reload();
        }}>
          <div className="row2">
            <div className="field"><label>Full name</label><input name="name" required defaultValue={edit === 'new' ? '' : edit.name} /></div>
            <div className="field"><label>Role / expertise</label><input name="role" required defaultValue={edit === 'new' ? '' : edit.role} /></div>
          </div>
          <div className="field"><label>Qualifications &amp; experience summary</label><textarea name="bio" defaultValue={edit === 'new' ? '' : edit.bio} /></div>
          <div className="row2">
            <div className="field"><label>Years of experience</label><input name="years" placeholder="e.g. 10+" defaultValue={edit === 'new' ? '' : edit.years} /></div>
            <div className="field"><label>Display order</label><input name="sort_order" type="number" defaultValue={edit === 'new' ? (staff?.length ?? 0) : edit.sort_order} /></div>
          </div>
        </Modal>
      )}
    </>
  );
}
