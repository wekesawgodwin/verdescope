import { useState, type FormEvent } from 'react';
import { Icon } from '../components/Icon';
import { api, downloadFile, useApi } from '../lib/api';
import type { SiteSettings } from '../lib/types';
import { ErrorBox, Loading, useToast } from './ui';

export default function Settings() {
  const { data: s, error, setData } = useApi<SiteSettings>('/settings');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  if (error) return <ErrorBox msg={error} />;
  if (!s) return <Loading />;

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f: Record<string, unknown> = Object.fromEntries(new FormData(e.currentTarget));
    f.maintenance = f.maintenance === 'on';
    setBusy(true);
    try { setData({ ...s!, ...(await api<SiteSettings>('/settings', { method: 'PUT', body: f })) }); toast('Settings saved'); }
    catch (x) { toast((x as Error).message, true); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid g-main">
      <form className="card" onSubmit={save}><div className="card-h"><h3>Company &amp; contact details</h3></div><div className="card-b">
        <div className="row2"><div className="field"><label>Company name</label><input name="company_name" defaultValue={s.company_name} /></div><div className="field"><label>Tagline</label><input name="tagline" defaultValue={s.tagline} /></div></div>
        <div className="row2"><div className="field"><label>Phone 1</label><input name="phone1" defaultValue={s.phone1} /></div><div className="field"><label>Phone 2</label><input name="phone2" defaultValue={s.phone2} /></div></div>
        <div className="field"><label>Office address</label><input name="address" defaultValue={s.address} /></div>
        <div className="field"><label>Postal address</label><input name="postal" defaultValue={s.postal} /></div>
        <div className="row2">
          <div className="field"><label>Public email (shown on website)</label><input type="email" name="public_email" defaultValue={s.public_email} /></div>
          <div className="field"><label>Company email (reply-to address)</label><input type="email" name="mail_from" defaultValue={s.mail_from} /><div className="hint">Recipients reply to this address.</div></div>
        </div>
        <div className="field"><label>Email signature</label><textarea name="mail_signature" defaultValue={s.mail_signature} /></div>
        <label className="switch" style={{ margin: '6px 0 18px' }}><input type="checkbox" name="maintenance" defaultChecked={s.maintenance} /> Show maintenance banner on public site</label>
        <div><button className="btn primary" disabled={busy}><Icon name="check" /> {busy ? 'Saving…' : 'Save settings'}</button></div>
      </div></form>
      <div>
        <div className="card mb"><div className="card-h"><h3>Email delivery</h3></div><div className="card-b">
          {s._email_provider
            ? <div className="demo-note"><Icon name="check" /><span>Connected via <b>{s._email_provider.toUpperCase()}</b>. Messages are sent from <b>{s._mail_from_env || s.mail_from}</b> with replies to <b>{s.mail_from}</b>.</span></div>
            : <div className="demo-note"><Icon name="mail" /><span>Not configured. Set <code>EMAIL_PROVIDER</code> (<code>resend</code> or <code>smtp</code>), <code>MAIL_FROM</code> and the provider credentials as environment variables on Railway, then redeploy. Until then replies are saved but not delivered.</span></div>}
        </div></div>
        <div className="card"><div className="card-h"><h3>Data</h3></div><div className="card-b">
          <p style={{ color: 'var(--muted)', marginTop: 0 }}>Download a JSON export of website content, inquiries, users and projects. Use Railway's Postgres backups for full database backups.</p>
          <button className="btn" onClick={() => downloadFile('/admin/export', 'verdescope-export.json').catch((e) => toast(e.message, true))}><Icon name="download" /> Export data</button>
        </div></div>
      </div>
    </div>
  );
}
