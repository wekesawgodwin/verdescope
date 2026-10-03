import { useState } from 'react';
import { Icon } from '../components/Icon';
import { api, useApi } from '../lib/api';
import { fileSize, fmtDate, today } from '../lib/format';
import type { DocumentFile, Project, User } from '../lib/types';
import { ErrorBox, Loading, Modal, projClass, useToast } from './ui';

export default function ProjectsAdmin() {
  const { data: projects, error, reload } = useApi<Project[]>('/projects');
  const { data: docs, reload: reloadDocs } = useApi<DocumentFile[]>('/documents');
  const { data: users } = useApi<User[]>('/users');
  const [edit, setEdit] = useState<Project | 'new' | null>(null);
  const [share, setShare] = useState(false);
  const toast = useToast();
  const orgs = [...new Set((users ?? []).filter((u) => u.role === 'stakeholder').map((u) => u.org))];
  const pname = (id: number | null) => projects?.find((p) => p.id === id)?.title ?? '—';

  async function del(p: Project) {
    if (!confirm(`Delete “${p.title}”?`)) return;
    await api(`/projects/${p.id}`, { method: 'DELETE' }); toast('Project deleted'); reload();
  }
  async function delDoc(d: DocumentFile) {
    if (!confirm(`Remove ${d.name}?`)) return;
    await api(`/documents/${d.id}`, { method: 'DELETE' }); toast('Document removed'); reloadDocs();
  }
  if (error) return <ErrorBox msg={error} />;

  return (
    <>
      <div className="toolbar"><span style={{ color: 'var(--muted)' }}>Projects and documents appear on each stakeholder's dashboard.</span><span className="sp" />
        <button className="btn" onClick={() => setShare(true)}><Icon name="file" /> Share document</button>
        <button className="btn primary" onClick={() => setEdit('new')}><Icon name="plus" /> New project</button></div>
      {!projects ? <Loading /> : (
        <div className="card mb"><div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Project</th><th>Stakeholder</th><th>Status</th><th style={{ minWidth: 160 }}>Progress</th><th>Due</th><th /></tr></thead>
          <tbody>{projects.map((p) => (
            <tr key={p.id}>
              <td className="t-title">{p.title}</td><td className="t-sub">{p.org}</td><td><span className={`st ${projClass(p.status)}`}>{p.status}</span></td>
              <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="prog" style={{ flex: 1 }}><i style={{ width: `${p.progress}%` }} /></div><span className="t-sub">{p.progress}%</span></div></td>
              <td className="t-sub">{fmtDate(p.due)}</td>
              <td className="actions"><button className="icon-btn" title="Edit" onClick={() => setEdit(p)}><Icon name="edit" /></button><button className="icon-btn danger" title="Delete" onClick={() => del(p)}><Icon name="trash" /></button></td>
            </tr>
          ))}</tbody>
        </table></div></div>
      )}
      <div className="card"><div className="card-h"><h3>Shared documents</h3><small>Stored securely; only the stakeholder organisation and admins can download</small></div>
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Document</th><th>Project</th><th>Stakeholder</th><th>Size</th><th>Shared</th><th /></tr></thead>
          <tbody>{docs?.map((d) => (
            <tr key={d.id}><td className="t-title">{d.name}</td><td className="t-sub">{pname(d.project_id)}</td><td className="t-sub">{d.org}</td><td className="t-sub">{fileSize(d.size)}</td><td className="t-sub">{fmtDate(d.created_at)}</td>
              <td className="actions"><button className="icon-btn danger" title="Remove" onClick={() => delDoc(d)}><Icon name="trash" /></button></td></tr>
          ))}</tbody></table></div></div>

      {edit && <ProjectEditor p={edit === 'new' ? null : edit} orgs={orgs} onClose={() => setEdit(null)} onSaved={reload} />}
      {share && projects && (
        <Modal title="Share a document" saveLabel="Upload & share" onClose={() => setShare(false)} onSubmit={async (fd) => {
          await api('/documents', { method: 'POST', form: fd }); toast('Document shared'); reloadDocs();
        }}>
          <div className="field"><label>Project</label><select name="project_id" required>{projects.map((p) => <option key={p.id} value={p.id}>{p.title} — {p.org}</option>)}</select></div>
          <div className="field"><label>File</label><input type="file" name="file" required /><div className="hint">PDF, Word, Excel, images… up to 100 MB. The stakeholder can download it from their dashboard.</div></div>
        </Modal>
      )}
    </>
  );
}

function ProjectEditor({ p, orgs, onClose, onSaved }: { p: Project | null; orgs: string[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const x = p ?? { title: '', org: orgs[0] ?? '', status: 'Planning', progress: 0, start: today(), due: '', lead: '', milestones: [] };
  const [progress, setProgress] = useState(x.progress);
  return (
    <Modal title={p ? 'Edit project' : 'New project'} wide onClose={onClose} onSubmit={async (fd) => {
      const f = Object.fromEntries(fd) as Record<string, string>;
      const milestones = f.milestones.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => ({ t: l.replace(/^\[x\]\s*/i, ''), done: /^\[x\]/i.test(l) }));
      await api(p ? `/projects/${p.id}` : '/projects', { method: p ? 'PUT' : 'POST', body: { ...f, progress: Number(f.progress), start: f.start || null, due: f.due || null, milestones } });
      toast('Project saved'); onSaved();
    }}>
      <div className="field"><label>Project title</label><input name="title" required defaultValue={x.title} /></div>
      <div className="row3">
        <div className="field"><label>Stakeholder</label><select name="org" defaultValue={x.org}>{[...new Set([...orgs, x.org].filter(Boolean))].map((o) => <option key={o}>{o}</option>)}</select></div>
        <div className="field"><label>Status</label><select name="status" defaultValue={x.status}>{['Planning', 'In progress', 'Report review', 'Completed'].map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="field"><label>Lead expert</label><input name="lead" defaultValue={x.lead} /></div>
      </div>
      <div className="row3">
        <div className="field"><label>Start</label><input type="date" name="start" defaultValue={x.start ?? ''} /></div>
        <div className="field"><label>Due</label><input type="date" name="due" defaultValue={x.due ?? ''} /></div>
        <div className="field"><label>Progress: {progress}%</label><input type="range" name="progress" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} style={{ padding: 0, accentColor: 'var(--accent)' }} /></div>
      </div>
      <div className="field"><label>Milestones (one per line; prefix with [x] when done)</label>
        <textarea name="milestones" style={{ minHeight: 130 }} defaultValue={x.milestones.map((m) => (m.done ? '[x] ' : '') + m.t).join('\n')} /></div>
    </Modal>
  );
}
