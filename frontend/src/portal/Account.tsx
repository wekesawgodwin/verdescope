import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { initials } from '../lib/format';
import type { User } from '../lib/types';
import { ROLE_LABEL } from './Layout';
import { useToast } from './ui';

export default function Account() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [pwErr, setPwErr] = useState('');

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try { setUser(await api<User>('/auth/me', { method: 'PATCH', body: { name: new FormData(e.currentTarget).get('name') } })); toast('Profile saved'); }
    catch (x) { toast((x as Error).message, true); }
  }
  async function changePw(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, f = new FormData(form);
    try { await api('/auth/password', { method: 'POST', body: { current: f.get('cur'), new: f.get('pw') } }); form.reset(); setPwErr(''); toast('Password updated'); }
    catch (x) { setPwErr((x as Error).message); }
  }

  return (
    <div className="grid g2">
      <form className="card" onSubmit={saveProfile}><div className="card-h"><h3>Profile</h3></div><div className="card-b">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
          <span className="avatar" style={{ width: 60, height: 60, fontSize: 22 }}>{initials(user!.name)}</span>
          <div><b style={{ fontWeight: 400, fontSize: 17 }}>{user!.name}</b><div style={{ color: 'var(--muted)' }}>{ROLE_LABEL[user!.role]} · {user!.org}</div></div>
        </div>
        <div className="field"><label>Display name</label><input name="name" defaultValue={user!.name} required /></div>
        <div className="field"><label>Email</label><input value={user!.email} disabled /></div>
        <button className="btn primary">Save profile</button>
      </div></form>
      <form className="card" onSubmit={changePw} style={{ alignSelf: 'start' }}><div className="card-h"><h3>Change password</h3></div><div className="card-b">
        <div className="field"><label>Current password</label><input type="password" name="cur" required autoComplete="current-password" /></div>
        <div className="field"><label>New password</label><input type="password" name="pw" required minLength={6} autoComplete="new-password" /></div>
        <div className="err" role="alert">{pwErr}</div>
        <button className="btn primary">Update password</button>
      </div></form>
    </div>
  );
}
