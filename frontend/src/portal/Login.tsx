import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/auth';

// Shown only in development builds or when VITE_SHOW_DEMO_LOGINS=true (e.g. for a demo deployment)
const SHOW_DEMO = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_LOGINS === 'true';
const DEMOS: [string, string, string, string, string][] = [
  ['admin@verdescope.demo', 'admin123', 'Super Admin', 'Users, roles, settings, everything', 'lock'],
  ['manager@verdescope.demo', 'manager123', 'Website Manager', 'Blog, gallery, services & company email', 'edit'],
  ['stakeholder@verdescope.demo', 'partner123', 'Stakeholder', 'County Government of Bomet: projects & reports', 'briefcase'],
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function go(email: string, password: string) {
    if (!email || !password) { setErr('Enter your email and password.'); return; }
    setBusy(true); setErr('');
    try { await login(email, password); nav(from && from !== '/portal/login' ? from : '/portal', { replace: true }); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); go(String(f.get('email')), String(f.get('password'))); };

  return (
    <div className="login">
      <div className="login-art">
        <img src="/assets/img/brand/logo-full-light.png" alt="Verde-Scope Africa Limited" />
        <h1>Client &amp; Staff Portal</h1>
        <p>Stakeholders track project progress and reports. Staff manage website content and respond to inquiries from the company mailbox.</p>
      </div>
      <div className="login-panel">
        <div className="login-box">
          <Link className="back-site" to="/"><Icon name="arrowL" /> Back to website</Link>
          <h2>Sign in</h2>
          <p>Use your Verde-Scope portal account.</p>
          <form onSubmit={submit} noValidate>
            <div className="field"><label htmlFor="em">Email</label><input id="em" name="email" type="email" required autoComplete="username" /></div>
            <div className="field"><label htmlFor="pw">Password</label><input id="pw" name="password" type="password" required autoComplete="current-password" /></div>
            <div className="err" role="alert">{err}</div>
            <button className="btn primary block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
          {SHOW_DEMO && (
            <div className="demo-accounts">
              <h4>Demo accounts (one click)</h4>
              {DEMOS.map(([e, p, t, s, ic]) => (
                <button key={e} className="demo" onClick={() => go(e, p)} disabled={busy}>
                  <span className="ic"><Icon name={ic} /></span>
                  <span><b>{t}</b><small>{e} · {p}</small><br /><small>{s}</small></span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
