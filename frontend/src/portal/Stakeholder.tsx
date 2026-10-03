import { useState, type FormEvent } from 'react';
import { Icon } from '../components/Icon';
import { api, downloadFile, useApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fileSize, fmtDate, fmtTime } from '../lib/format';
import type { DocumentFile, Inquiry, OutboundEmail, Project } from '../lib/types';
import { ProjectBlock } from './Overview';
import { ErrorBox, Loading, StatusPill, useToast } from './ui';

interface MyOverview { projects: Project[]; documents: DocumentFile[] }

export function MyProjects() {
  const { data, error } = useApi<MyOverview>('/me/overview');
  if (error) return <ErrorBox msg={error} />;
  if (!data) return <Loading />;
  return <div className="card">{data.projects.length ? data.projects.map((p) => <ProjectBlock key={p.id} p={p} />) : <div className="empty">No projects assigned yet.</div>}</div>;
}

export function MyDocuments() {
  const { user } = useAuth();
  const { data, error } = useApi<MyOverview>('/me/overview');
  const toast = useToast();
  if (error) return <ErrorBox msg={error} />;
  if (!data) return <Loading />;
  const pname = (id: number | null) => data.projects.find((p) => p.id === id)?.title ?? '—';
  return (
    <div className="card"><div className="card-h"><h3>Reports &amp; documents</h3><small>{data.documents.length} files shared with {user!.org}</small></div>
      <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Document</th><th>Project</th><th>Size</th><th>Shared</th><th /></tr></thead>
        <tbody>
          {data.documents.map((d) => (
            <tr key={d.id}>
              <td><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon name="file" size={18} /><span className="t-title">{d.name}</span></span></td>
              <td className="t-sub">{pname(d.project_id)}</td><td className="t-sub">{fileSize(d.size)}</td><td className="t-sub">{fmtDate(d.created_at)}</td>
              <td className="actions"><button className="btn sm" onClick={() => downloadFile(`/documents/${d.id}/download`, d.name).catch((e) => toast(e.message, true))}><Icon name="download" /> Download</button></td>
            </tr>
          ))}
          {!data.documents.length && <tr><td colSpan={5} className="empty">No documents yet.</td></tr>}
        </tbody></table></div></div>
  );
}

type Msg = Inquiry & { replies: OutboundEmail[] };

export function MyMessages() {
  const { data: msgs, error, reload } = useApi<Msg[]>('/me/messages');
  const { data: ov } = useApi<MyOverview>('/me/overview');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    try { await api('/me/messages', { method: 'POST', body: Object.fromEntries(new FormData(form)) }); form.reset(); toast('Message sent to the Verde-Scope team'); reload(); }
    catch (x) { toast((x as Error).message, true); }
    finally { setBusy(false); }
  }
  if (error) return <ErrorBox msg={error} />;

  return (
    <div className="grid g-main">
      <div className="card"><div className="card-h"><h3>Conversation history</h3></div>
        {!msgs ? <Loading /> : msgs.length ? msgs.map((q) => (
          <div key={q.id} style={{ borderBottom: '1px solid var(--line)' }}>
            <div className="msg"><div className="msg-h"><b style={{ color: 'var(--text)' }}>{q.subject}</b> · {fmtTime(q.created_at)} · <StatusPill s={q.status} /></div>{q.message}</div>
            {q.replies.map((r) => <div className="msg out" key={r.id}><div className="msg-h">Reply from <b style={{ color: 'var(--text)' }}>Verde-Scope Africa</b> · {fmtTime(r.created_at)}</div>{r.body}</div>)}
          </div>
        )) : <div className="empty">No messages yet. Use the form to contact the team.</div>}
      </div>
      <form className="card" style={{ alignSelf: 'start' }} onSubmit={send}><div className="card-h"><h3>New message</h3></div><div className="card-b">
        <div className="field"><label>Related project</label><select name="project">{ov?.projects.map((p) => <option key={p.id}>{p.title}</option>)}<option>General</option></select></div>
        <div className="field"><label>Subject</label><input name="subject" required /></div>
        <div className="field"><label>Message</label><textarea name="message" required /></div>
        <button className="btn primary block" disabled={busy}><Icon name="send" /> {busy ? 'Sending…' : 'Send to Verde-Scope'}</button>
      </div></form>
    </div>
  );
}
