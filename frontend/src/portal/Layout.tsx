import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useInstall } from '../components/useInstall';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { initials } from '../lib/format';
import type { Role } from '../lib/types';
import { ACCESS } from './access';

export const ROLE_LABEL: Record<Role, string> = { admin: 'Super Admin', manager: 'Website Manager', stakeholder: 'Stakeholder' };

type Item = [path: string, label: string, icon: string];
const GROUPS: [string, Item[]][] = [
  ['Main', [['', 'Dashboard', 'grid'], ['mail', 'Company Email', 'mail'], ['projects', 'My Projects', 'briefcase'], ['documents', 'Reports & Documents', 'file'], ['messages', 'Messages', 'message']]],
  ['Website content', [['posts', 'Blog Posts', 'edit'], ['gallery', 'Gallery', 'image'], ['services', 'Services', 'leaf']]],
  ['Administration', [['users', 'Users & Roles', 'people'], ['projects', 'Stakeholder Projects', 'briefcase'], ['settings', 'Settings', 'settings'], ['activity', 'Activity Log', 'activity']]],
  ['Account', [['account', 'My Account', 'user']]],
];

function navFor(role: Role) {
  return GROUPS.map(([g, items]) => [g, items.filter(([p, label]) => {
    if (!ACCESS[p].includes(role)) return false;
    if (p === 'projects') return role === 'admin' ? label === 'Stakeholder Projects' : label === 'My Projects';
    return true;
  })] as [string, Item[]]).filter(([, items]) => items.length);
}

/** Unread mail count shared with pages so the badge updates after reading mail. */
const CountsCtx = createContext<{ unread: number; refresh: () => void }>({ unread: 0, refresh: () => {} });
export const useMailCounts = () => useContext(CountsCtx);

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const install = useInstall();
  const staff = user!.role !== 'stakeholder';

  const refresh = useCallback(() => {
    if (staff) api<{ unread: number }>('/mail/counts').then((c) => setUnread(c.unread)).catch(() => {});
  }, [staff]);
  useEffect(() => { refresh(); const t = setInterval(refresh, 60_000); return () => clearInterval(t); }, [refresh]);
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  const groups = navFor(user!.role);
  const sub = loc.pathname.replace(/^\/portal\/?/, '').split('/')[0];
  const current = groups.flatMap(([, i]) => i).find(([p]) => p === sub);
  const title = current?.[1] ?? (sub === '' ? 'Dashboard' : '');
  useEffect(() => { document.title = `${title || 'Portal'} — Verde-Scope Portal`; }, [title]);

  return (
    <CountsCtx.Provider value={{ unread, refresh }}>
      <div className="app">
        <aside className={'side' + (open ? ' open' : '')}>
          <Link className="side-brand" to="/" title="View website"><img src="/assets/img/brand/logo-emblem-light.png" alt="" /><div><b>VERDE-<span>SCOPE</span></b><small>AFRICA LIMITED</small></div></Link>
          <div className="role-badge">{ROLE_LABEL[user!.role]} Portal</div>
          <nav>
            {groups.map(([g, items]) => (
              <div key={g}>
                <div className="group">{g}</div>
                {items.map(([p, label, ic]) => (
                  <NavLink key={p + label} to={p ? `/portal/${p}` : '/portal'} end={!p} className={({ isActive }) => (isActive ? 'active' : '')}>
                    <Icon name={ic} /><span>{label}</span>{p === 'mail' && unread > 0 && <span className="count">{unread}</span>}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
          <div className="side-foot">
            {install && <a href="#" onClick={(e) => { e.preventDefault(); install(); }} style={{ marginBottom: 10 }}><Icon name="download" /> Install portal app</a>}
            {staff && <Link to="/client-notes" target="_blank" style={{ marginBottom: 10 }}><Icon name="file" /> Client notes (budget)</Link>}
            <Link to="/" target="_blank"><Icon name="globe" /> View public website</Link>
          </div>
        </aside>
        {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 55 }} />}
        <div className="main">
          <header className="top">
            <button className="icon-btn menu-btn" aria-label="Menu" onClick={() => setOpen(!open)}><Icon name="menu" /></button>
            <h1>{title}</h1>
            <Link className="icon-btn bell" to={staff ? '/portal/mail' : '/portal/messages'} aria-label={staff && unread ? `${unread} unread messages` : 'Messages'}>
              <Icon name="bell" />{staff && unread > 0 && <span className="dot">{unread}</span>}
            </Link>
            <div className="user-chip">
              <span className="avatar">{initials(user!.name)}</span>
              <div><b>{user!.name}</b><small>{ROLE_LABEL[user!.role]}</small></div>
              <button className="icon-btn" title="Sign out" aria-label="Sign out" onClick={() => { logout(); nav('/portal/login'); }}><Icon name="logout" /></button>
            </div>
          </header>
          <main className="content"><Outlet /></main>
        </div>
      </div>
    </CountsCtx.Provider>
  );
}
