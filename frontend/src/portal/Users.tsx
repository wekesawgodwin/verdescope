import { useState } from 'react';
import { Icon } from '../components/Icon';
import { api, useApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ago, initials } from '../lib/format';
import type { Role, User } from '../lib/types';
import { ROLE_LABEL } from './Layout';
import { ErrorBox, Loading, Modal, useToast } from './ui';

const PERMS: [string, number, number, number][] = [
  ['View own projects, documents & messages', 1, 0, 1], ['Read & reply to company email', 0, 1, 1], ['Manage blog, gallery & services', 0, 1, 1],
  ['Manage stakeholder projects & documents', 0, 0, 1], ['Manage users & roles', 0, 0, 1], ['Site settings, activity log & data export', 0, 0, 1],
];

export default function Users() {
  const { user: me } = useAuth();
  const { data: users, error, reload } = useApi<User[]>('/users');
  const [edit, setEdit] = useState<User | 'new' | null>(null);
  const [role, setRole] = useState<Role | ''>('');
  const [q, setQ] = useState('');
  const toast = useToast();

  const save = async (u: User, patch: Partial<User>, msg: string) => {
    try { await api(`/users/${u.id}`, { method: 'PUT', body: { ...u, ...patch } }); toast(msg); reload(); } catch (e) { toast((e as Error).message, true); }
  };
  async function del(u: User) {
    if (!confirm(`Delete ${u.name}?`)) return;
    try { await api(`/users/${u.id}`, { method: 'DELETE' }); toast('User deleted'); reload(); } catch (e) { toast((e as Error).message, true); }
  }
  if (error) return <ErrorBox msg={error} />;
  const shown = (users ?? []).filter((u) => (!role || u.role === role) && (u.name + u.email + u.org).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="toolbar">
        <input className="inp" placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg">{([['', 'All'], ['admin', 'Super Admin'], ['manager', 'Manager'], ['stakeholder', 'Stakeholder']] as const).map(([r, l]) => <button key={r} className={role === r ? 'active' : ''} onClick={() => setRole(r)}>{l}</button>)}</div>
        <span className="sp" /><button className="btn primary" onClick={() => setEdit('new')}><Icon name="plus" /> Add user</button>
      </div>
      {!users ? <Loading /> : (
        <div className="card mb"><div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>User</th><th>Role</th><th>Organisation</th><th>Status</th><th>Last sign-in</th><th /></tr></thead>
          <tbody>{shown.map((u) => (
            <tr key={u.id}>
              <td><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><span className="avatar">{initials(u.name)}</span>
                <div><div className="t-title">{u.name}{u.id === me!.id && <span className="t-sub"> (you)</span>}</div><div className="t-sub">{u.email}</div></div></div></td>
              <td>{ROLE_LABEL[u.role]}</td><td className="t-sub">{u.org}</td>
              <td>{u.active ? <span className="st good">Active</span> : <span className="st bad">Disabled</span>}</td>
              <td className="t-sub">{ago(u.last_login)}</td>
              <td className="actions">
                <button className="icon-btn" title="Edit" onClick={() => setEdit(u)}><Icon name="edit" /></button>
                {u.id !== me!.id && <>
                  <button className="icon-btn" title={u.active ? 'Disable' : 'Enable'} onClick={() => save(u, { active: !u.active }, `${u.active ? 'Disabled' : 'Enabled'} ${u.name}`)}><Icon name="lock" /></button>
                  <button className="icon-btn danger" title="Delete" onClick={() => del(u)}><Icon name="trash" /></button>
                </>}
              </td>
            </tr>
          ))}</tbody>
        </table></div></div>
      )}
      <div className="card"><div className="card-h"><h3>Role permissions</h3><small>What each role can access</small></div>
        <div className="tbl-wrap"><table className="tbl perm"><thead><tr><th>Capability</th><th>Stakeholder</th><th>Website Manager</th><th>Super Admin</th></tr></thead>
          <tbody>{PERMS.map(([t, ...r]) => <tr key={t}><td>{t}</td>{r.map((v, i) => <td key={i} className={v ? 'y' : 'n'}>{v ? <><Icon name="check" /><span className="sr-only">Yes</span></> : <span aria-label="No">—</span>}</td>)}</tr>)}</tbody>
        </table></div></div>
      {edit && <UserEditor u={edit === 'new' ? null : edit} self={edit !== 'new' && edit.id === me!.id} onClose={() => setEdit(null)} onSaved={reload} />}
    </>
  );
}

function UserEditor({ u, self, onClose, onSaved }: { u: User | null; self: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const x = u ?? { name: '', email: '', role: 'stakeholder' as Role, org: '', active: true };
  return (
    <Modal title={u ? 'Edit user' : 'Add user'} saveLabel={u ? 'Save' : 'Create user'} onClose={onClose} onSubmit={async (fd) => {
      const body: Record<string, unknown> = Object.fromEntries(fd);
      if (u) { body.active = u.active; if (!body.password) delete body.password; }
      await api(u ? `/users/${u.id}` : '/users', { method: u ? 'PUT' : 'POST', body });
      toast(u ? 'User updated' : 'User created'); onSaved();
    }}>
      <div className="row2">
        <div className="field"><label>Full name / organisation name</label><input name="name" required defaultValue={x.name} /></div>
        <div className="field"><label>Email</label><input type="email" name="email" required defaultValue={x.email} /></div>
      </div>
      <div className="row2">
        <div className="field"><label>Role</label>
          {self ? <><input value={ROLE_LABEL[x.role]} disabled /><input type="hidden" name="role" value={x.role} /></>
            : <select name="role" defaultValue={x.role}>{Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}
        </div>
        <div className="field"><label>Organisation</label><input name="org" required defaultValue={x.org} /><div className="hint">Stakeholders see projects and documents for this organisation.</div></div>
      </div>
      <div className="field"><label>{u ? 'New password (leave blank to keep)' : 'Temporary password'}</label><input name="password" type="text" required={!u} minLength={6} autoComplete="new-password" /></div>
    </Modal>
  );
}
