import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ago, fileSize, fmtDate, initials } from '../lib/format';
import type { ActivityItem, Announcement, DocumentFile, Inquiry, Project } from '../lib/types';
import { BarChart, ErrorBox, HBarChart, Loading, projClass, StatusPill } from './ui';

interface Dash {
  visits: { month: string; year: number; value: number }[];
  inquiries: { open: number; unread: number; total: number };
  posts: { published: number; drafts: number };
  gallery: { events: number; media: number };
  users: { active: number; stakeholders: number };
  projects: { count: number; avg_progress: number };
  by_service: { label: string; value: number }[];
  latest: Inquiry[];
  activity: ActivityItem[];
}

export default function Overview() {
  const { user } = useAuth();
  return user!.role === 'stakeholder' ? <StakeholderOverview /> : <StaffOverview />;
}

const Tile = ({ label, icon, value, sub }: { label: string; icon: string; value: ReactNode; sub: ReactNode }) => (
  <div className="tile"><div className="lbl"><Icon name={icon} />{label}</div><div className="val">{value}</div><div className="sub">{sub}</div></div>
);

function StaffOverview() {
  const { user } = useAuth();
  const { data: d, error } = useApi<Dash>('/dashboard');
  if (error) return <ErrorBox msg={error} />;
  if (!d) return <Loading />;
  const isAdmin = user!.role === 'admin';
  const [prev, last] = [d.visits[d.visits.length - 3], d.visits[d.visits.length - 2]];
  const change = prev.value ? Math.round(((last.value - prev.value) / prev.value) * 100) : 0;

  return (
    <>
      <div className="welcome">
        <div><h2>Welcome back, {user!.name}</h2>
          <p>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {d.inquiries.unread ? `You have ${d.inquiries.unread} unread inquir${d.inquiries.unread === 1 ? 'y' : 'ies'}.` : 'Inbox is clear.'}</p></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn primary" to="/portal/mail"><Icon name="mail" /> Open email</Link>
          <Link className="btn" to="/portal/posts?new=1"><Icon name="plus" /> New post</Link>
        </div>
      </div>
      <div className="grid g4 mb">
        <Tile label="Website visits" icon="eye" value={last.value.toLocaleString()} sub={<>{last.month} · <b>{change >= 0 ? '+' : ''}{change}%</b> vs {prev.month}</>} />
        <Tile label="Open inquiries" icon="inbox" value={d.inquiries.open} sub={`${d.inquiries.unread} unread · ${d.inquiries.total} total`} />
        {isAdmin
          ? <Tile label="Portal users" icon="people" value={d.users.active} sub={`${d.users.stakeholders} stakeholder accounts`} />
          : <Tile label="Blog posts" icon="edit" value={d.posts.published} sub={`${d.posts.drafts} draft${d.posts.drafts === 1 ? '' : 's'}`} />}
        {isAdmin
          ? <Tile label="Active projects" icon="briefcase" value={d.projects.count} sub={`${d.projects.avg_progress}% average progress`} />
          : <Tile label="Gallery media" icon="image" value={d.gallery.media} sub={`${d.gallery.events} events`} />}
      </div>
      <div className="grid g-main mb">
        <div className="card"><div className="card-h"><h3>Website visits</h3><small>Monthly page views · current month to date shown faded</small></div>
          <div className="card-b"><BarChart data={d.visits.map((v) => ({ label: v.month, full: `${v.month} ${v.year}`, value: v.value }))} label="Visits" fadeLast /></div></div>
        <div className="card"><div className="card-h"><h3>Latest inquiries</h3><Link className="btn sm" to="/portal/mail">Inbox</Link></div>
          {d.latest.length ? d.latest.map((q) => (
            <Link className="list-item" key={q.id} to={`/portal/mail?open=${q.id}`}>
              <span className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>{initials(q.name)}</span>
              <div className="grow"><div className="t" style={q.read ? undefined : { fontWeight: 700 }}>{q.name}</div><div className="s" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.subject}</div></div>
              <div style={{ textAlign: 'right' }}><time>{ago(q.created_at)}</time><div style={{ marginTop: 4 }}><StatusPill s={q.status} /></div></div>
            </Link>
          )) : <div className="empty">No inquiries yet.</div>}
        </div>
      </div>
      <div className="grid g2">
        <div className="card"><div className="card-h"><h3>Inquiries by service</h3><small>All time</small></div><div className="card-b"><HBarChart data={d.by_service} label="Inquiries" /></div></div>
        <div className="card">
          <div className="card-h"><h3>{isAdmin ? 'Recent activity' : 'Content at a glance'}</h3>{isAdmin && <Link className="btn sm" to="/portal/activity">All activity</Link>}</div>
          {isAdmin
            ? d.activity.map((a) => <div className="list-item" key={a.id}><span className="ic"><Icon name="activity" /></span><div className="grow"><div className="t">{a.action}</div><div className="s">{a.user_name}</div></div><time>{ago(a.created_at)}</time></div>)
            : ([['edit', 'Blog posts', `${d.posts.published} published, ${d.posts.drafts} draft`, '/portal/posts'], ['image', 'Gallery', `${d.gallery.events} events · ${d.gallery.media} photos & videos`, '/portal/gallery'],
                ['leaf', 'Services', 'Edit service areas', '/portal/services'], ['globe', 'Public website', 'Open the live site', '/']] as const).map(([ic, t, s, to]) => (
                <Link className="list-item" key={t} to={to} target={to === '/' ? '_blank' : undefined}><span className="ic"><Icon name={ic} /></span><div className="grow"><div className="t">{t}</div><div className="s">{s}</div></div><Icon name="arrowR" size={16} /></Link>
              ))}
        </div>
      </div>
    </>
  );
}

export function ProjectBlock({ p }: { p: Project }) {
  return (
    <div className="proj">
      <div className="proj-h"><h4>{p.title}</h4><span className={`st ${projClass(p.status)}`}>{p.status}</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div className="prog" style={{ flex: 1 }}><i style={{ width: `${p.progress}%` }} /></div><b style={{ fontFamily: 'var(--head)', fontWeight: 400 }}>{p.progress}%</b></div>
      <div className="miles">{p.milestones.map((m) => <span key={m.t} className={'mile' + (m.done ? ' done' : '')}><Icon name={m.done ? 'check' : 'clock'} />{m.t}</span>)}</div>
      <div className="proj-meta"><span>Start: {fmtDate(p.start)}</span><span>Due: {fmtDate(p.due)}</span>{p.lead && <span>Lead: {p.lead}</span>}</div>
    </div>
  );
}

interface MyOverview { projects: Project[]; documents: DocumentFile[]; announcements: Announcement[]; messages: number; answered: number }

function StakeholderOverview() {
  const { user } = useAuth();
  const { data: d, error } = useApi<MyOverview>('/me/overview');
  if (error) return <ErrorBox msg={error} />;
  if (!d) return <Loading />;
  const avg = d.projects.length ? Math.round(d.projects.reduce((a, p) => a + p.progress, 0) / d.projects.length) : 0;
  return (
    <>
      <div className="welcome"><div><h2>{user!.org}</h2><p>Track your projects with Verde-Scope Africa, download reports and message our team.</p></div>
        <Link className="btn primary" to="/portal/messages"><Icon name="message" /> Message the team</Link></div>
      <div className="grid g4 mb">
        <Tile label="Active projects" icon="briefcase" value={d.projects.length} sub="with Verde-Scope" />
        <div className="tile"><div className="lbl"><Icon name="chart" />Average progress</div><div className="val">{avg}%</div><div className="prog" style={{ marginTop: 8 }}><i style={{ width: `${avg}%` }} /></div></div>
        <Tile label="Documents" icon="file" value={d.documents.length} sub={d.documents[0] ? `Latest: ${fmtDate(d.documents[0].created_at)}` : 'None yet'} />
        <Tile label="Messages" icon="message" value={d.messages} sub={`${d.answered} answered`} />
      </div>
      <div className="grid g-main">
        <div className="card"><div className="card-h"><h3>Project progress</h3><Link className="btn sm" to="/portal/projects">Details</Link></div>
          {d.projects.length ? d.projects.map((p) => <ProjectBlock key={p.id} p={p} />) : <div className="empty">No projects assigned yet.</div>}</div>
        <div>
          <div className="card mb"><div className="card-h"><h3>Announcements</h3></div>
            {d.announcements.map((a) => <div className="list-item" key={a.id}><span className="ic"><Icon name="bell" /></span><div className="grow"><div className="t">{a.title}</div><div className="s">{a.body}</div></div><time>{fmtDate(a.date)}</time></div>)}</div>
          <div className="card"><div className="card-h"><h3>Recent documents</h3><Link className="btn sm" to="/portal/documents">All</Link></div>
            {d.documents.slice(0, 4).map((x) => <div className="list-item" key={x.id}><span className="ic"><Icon name="file" /></span><div className="grow"><div className="t">{x.name}</div><div className="s">{fileSize(x.size)} · {fmtDate(x.created_at)}</div></div></div>)}
            {!d.documents.length && <div className="empty">No documents yet.</div>}</div>
        </div>
      </div>
    </>
  );
}
