import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { api, useApi } from '../lib/api';
import { ago, fmtTime, initials } from '../lib/format';
import type { Inquiry, InquiryDetail, InquiryStatus, OutboundEmail, SiteSettings } from '../lib/types';
import { useMailCounts } from './Layout';
import { Modal, STATUS, StatusPill, useToast } from './ui';

type Folder = 'inbox' | 'unread' | 'sent' | 'archived';
const FOLDERS: [Folder, string, string][] = [['inbox', 'Inbox', 'inbox'], ['unread', 'Unread', 'mail'], ['sent', 'Sent', 'send'], ['archived', 'Archived', 'archive']];

const first = (n: string) => n.split(' ')[0];
const TEMPLATES: Record<string, (q: Inquiry) => string> = {
  Acknowledge: (q) => `Dear ${first(q.name)},\n\nThank you for contacting Verde-Scope Africa Limited regarding "${q.subject}". We have received your inquiry and a member of our technical team will get back to you within one business day.`,
  'Request details': (q) => `Dear ${first(q.name)},\n\nThank you for your inquiry. To prepare an accurate proposal, kindly share:\n- Project location and size\n- Expected timelines\n- Any existing studies, drawings or licences\n\nWe look forward to working with you.`,
  'Book a meeting': (q) => `Dear ${first(q.name)},\n\nThank you for reaching out. We would be glad to discuss your requirements in detail. Are you available for a short call or a meeting at our offices at One Africa Place, Westlands this week?`,
};

export default function Mail() {
  const [params, setParams] = useSearchParams();
  const [folder, setFolder] = useState<Folder>('inbox');
  const [sel, setSel] = useState<number | null>(params.get('open') ? Number(params.get('open')) : null);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<(Inquiry | OutboundEmail)[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [compose, setCompose] = useState(false);
  const { data: settings } = useApi<SiteSettings>('/mail/config');
  const { refresh: refreshBadge } = useMailCounts();

  const load = useCallback(async () => {
    const search = q ? `q=${encodeURIComponent(q)}` : '';
    const [list, c] = await Promise.all([
      folder === 'sent' ? api<OutboundEmail[]>(`/mail/sent?${search}`) : api<Inquiry[]>(`/mail/inquiries?folder=${folder}&${search}`),
      api<Record<string, number>>('/mail/counts'),
    ]);
    setItems(list); setCounts(c); refreshBadge();
  }, [folder, q, refreshBadge]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);
  useEffect(() => { if (params.get('open')) setParams({}, { replace: true }); }, [params, setParams]);

  const pick = (f: Folder) => { setFolder(f); setSel(null); };
  const mailFrom = settings?.mail_from ?? '';

  return (
    <>
      <div className={'mail' + (sel ? ' reading' : '')}>
        <div className="mail-folders">
          <button className="btn primary" onClick={() => setCompose(true)}><Icon name="edit" /> Compose</button>
          {FOLDERS.map(([k, l, ic]) => <a key={k} className={folder === k ? 'active' : ''} onClick={() => pick(k)} role="button" tabIndex={0}><Icon name={ic} />{l}<span className="count">{counts[k] || ''}</span></a>)}
          <div className="mail-from"><b>Sending as</b>{mailFrom}</div>
        </div>
        <div className="mail-list">
          <div className="mail-search">
            <select className="inp mail-folder-select" style={{ display: 'none', marginBottom: 8 }} value={folder} onChange={(e) => pick(e.target.value as Folder)}>
              {FOLDERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="inp" placeholder="Search mail…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search mail" />
              <button className="btn sm mail-folder-select" style={{ display: 'none' }} aria-label="Compose" onClick={() => setCompose(true)}><Icon name="edit" /></button>
            </div>
          </div>
          {items && !items.length && <div className="empty">No messages here.</div>}
          {items?.map((m) => 'to_email' in m
            ? <div key={'s' + m.id} className={'mail-item' + (sel === m.id ? ' active' : '')} onClick={() => setSel(m.id)}>
                <div className="r1"><b>To: {m.to_name || m.to_email}</b><time>{ago(m.created_at)}</time></div>
                <div className="subj">{m.subject}</div><div className="prev">{m.body.slice(0, 90)}</div>
                {!m.delivered && <div className="tags"><span className="st warn">Not delivered</span></div>}
              </div>
            : <div key={m.id} className={'mail-item' + (m.read ? '' : ' unread') + (sel === m.id ? ' active' : '')} onClick={() => setSel(m.id)}>
                <div className="r1"><b>{m.name}</b><time>{ago(m.created_at)}</time></div>
                <div className="subj">{m.subject}</div><div className="prev">{m.message.slice(0, 90)}</div>
                <div className="tags"><StatusPill s={m.status} />{m.source === 'stakeholder' && <span className="st info">Stakeholder</span>}</div>
              </div>)}
        </div>
        <div className="mail-read">
          {!sel ? <div className="empty" style={{ margin: 'auto' }}>Select a message to read.</div>
            : folder === 'sent'
              ? <SentReader email={(items as OutboundEmail[] | null)?.find((x) => x.id === sel)} onBack={() => setSel(null)} />
              : <Reader key={sel} id={sel} settings={settings} onBack={() => setSel(null)} onChange={load} onGone={() => { setSel(null); load(); }} />}
        </div>
      </div>
      <div className="demo-note" style={{ marginTop: 12 }}><Icon name="globe" />
        <span>{settings?._email_provider
          ? <>Replies are delivered from <b>{settings._mail_from_env || mailFrom}</b> via {settings._email_provider.toUpperCase()}; replies go back to {mailFrom}.</>
          : <>Email delivery is not configured yet: replies are saved here and marked “Not delivered”. Set EMAIL_PROVIDER on the server (SMTP or Resend) to send from {mailFrom}.</>}</span>
      </div>
      {compose && <Compose settings={settings} onClose={() => setCompose(false)} onSent={() => pick('sent')} />}
    </>
  );
}

function SentReader({ email: s, onBack }: { email?: OutboundEmail; onBack: () => void }) {
  if (!s) return <div className="empty" style={{ margin: 'auto' }}>Select a message to read.</div>;
  return (
    <>
      <div className="read-h">
        <button className="btn sm mail-back" onClick={onBack}><Icon name="arrowL" /> Back</button>
        <h2>{s.subject}</h2>
        <div className="read-meta"><span className="avatar">{initials(s.to_name || s.to_email)}</span>
          <div className="who"><b>To: {s.to_name} &lt;{s.to_email}&gt;</b><small>From {s.from_email} · {fmtTime(s.created_at)}{s.sent_by && ` · by ${s.sent_by}`}</small></div></div>
      </div>
      {!s.delivered && <div className="read-info" style={{ color: 'var(--warn)' }}>Not delivered: {s.error}</div>}
      <div className="msg out">{s.body}</div>
    </>
  );
}

function Reader({ id, settings, onBack, onChange, onGone }: { id: number; settings: SiteSettings | null; onBack: () => void; onChange: () => void; onGone: () => void }) {
  const { data: m, setData, error } = useApi<InquiryDetail>(`/mail/inquiries/${id}`);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  // Opening marks the message read on the server; refresh list + badge once
  useEffect(() => { if (m) onChange(); }, [m?.id]);

  if (error) return <div className="empty" style={{ margin: 'auto' }}>{error}</div>;
  if (!m) return <div className="skeleton" style={{ margin: 20 }} />;
  const sig = settings ? '\n\n' + settings.mail_signature : '';

  const patch = async (p: Partial<Pick<Inquiry, 'status' | 'folder'>>, msg: string) => {
    try { const r = await api<Inquiry>(`/mail/inquiries/${m.id}`, { method: 'PATCH', body: p }); setData({ ...m, ...r }); toast(msg); p.folder ? onGone() : onChange(); }
    catch (e) { toast((e as Error).message, true); }
  };
  async function del() {
    if (!confirm('Delete this message permanently?')) return;
    await api(`/mail/inquiries/${m!.id}`, { method: 'DELETE' }); toast('Message deleted'); onGone();
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      const r = await api<InquiryDetail['replies'][number]>(`/mail/inquiries/${m!.id}/reply`, { method: 'POST', body: { body } });
      setData({ ...m!, status: 'replied', replies: [...m!.replies, r] });
      setBody('');
      toast(r.delivered ? `Reply sent to ${m!.email}` : 'Reply saved, but not delivered (email not configured)', !r.delivered);
      onChange();
    } catch (x) { toast((x as Error).message, true); }
    finally { setBusy(false); }
  }
  const mailto = `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent('Re: ' + m.subject)}&body=${encodeURIComponent(body)}`;

  return (
    <>
      <div className="read-h">
        <button className="btn sm mail-back" onClick={onBack}><Icon name="arrowL" /> Back</button>
        <h2>{m.subject}</h2>
        <div className="read-meta"><span className="avatar">{initials(m.name)}</span>
          <div className="who"><b>{m.name}</b><small>&lt;{m.email}&gt; · {fmtTime(m.created_at)}</small></div>
          <div className="read-tools">
            <select aria-label="Status" value={m.status} onChange={(e) => patch({ status: e.target.value as InquiryStatus }, 'Status updated')}>
              {Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <button className="icon-btn" title={m.folder === 'archived' ? 'Move to inbox' : 'Archive'} onClick={() => patch({ folder: m.folder === 'archived' ? 'inbox' : 'archived' }, m.folder === 'archived' ? 'Moved to inbox' : 'Archived')}><Icon name={m.folder === 'archived' ? 'inbox' : 'archive'} /></button>
            <button className="icon-btn danger" title="Delete" onClick={del}><Icon name="trash" /></button>
          </div>
        </div>
      </div>
      <div className="read-info">
        {m.org && <span>Organisation: <b>{m.org}</b></span>}{m.phone && <span>Phone: <b>{m.phone}</b></span>}
        <span>Service: <b>{m.service}</b></span><span>Source: <b>{m.source === 'stakeholder' ? 'Stakeholder portal' : 'Website contact form'}</b></span>
      </div>
      <div className="msg">{m.message}</div>
      {m.replies.map((r) => (
        <div className="msg out" key={r.id}>
          <div className="msg-h"><b style={{ color: 'var(--text)' }}>{r.from_email}</b> · {fmtTime(r.created_at)}{r.sent_by && ` · sent by ${r.sent_by}`}
            {r.delivered ? <span className="st good" style={{ marginLeft: 8 }}>Delivered</span> : <span className="st warn" style={{ marginLeft: 8 }} title={r.error}>Not delivered</span>}</div>
          {r.body}
        </div>
      ))}
      <form className="reply" onSubmit={send}>
        <div className="templates"><span style={{ fontSize: 12, color: 'var(--faint)', alignSelf: 'center' }}>Templates:</span>
          {Object.keys(TEMPLATES).map((k) => <button type="button" key={k} onClick={() => setBody(TEMPLATES[k](m) + sig)}>{k}</button>)}</div>
        <div className="field" style={{ marginBottom: 10 }}><textarea value={body} onChange={(e) => setBody(e.target.value)} required placeholder={`Write a reply to ${m.name}…`} aria-label="Reply" /></div>
        <div className="reply-bar"><span style={{ fontSize: 12.5, color: 'var(--muted)' }}>From: {settings?.mail_from}</span><span className="sp" />
          <a className="btn" href={mailto} target="_blank" rel="noreferrer"><Icon name="mail" /> Open in email app</a>
          <button className="btn primary" disabled={busy}><Icon name="send" /> {busy ? 'Sending…' : 'Send reply'}</button></div>
      </form>
    </>
  );
}

function Compose({ settings, onClose, onSent }: { settings: SiteSettings | null; onClose: () => void; onSent: () => void }) {
  const toast = useToast();
  return (
    <Modal title="New email" saveLabel="Send" onClose={onClose} onSubmit={async (fd) => {
      const r = await api<OutboundEmail>('/mail/send', { method: 'POST', body: Object.fromEntries(fd) });
      toast(r.delivered ? 'Email sent' : 'Saved to Sent, but not delivered (email not configured)', !r.delivered);
      onSent();
    }}>
      <div className="field"><label>From</label><input value={settings?.mail_from ?? ''} disabled /></div>
      <div className="row2"><div className="field"><label>To (email)</label><input name="to" type="email" required /></div><div className="field"><label>Recipient name</label><input name="to_name" /></div></div>
      <div className="field"><label>Subject</label><input name="subject" required /></div>
      <div className="field"><label>Message</label><textarea name="body" required style={{ minHeight: 200 }} defaultValue={settings ? '\n\n' + settings.mail_signature : ''} /></div>
    </Modal>
  );
}
