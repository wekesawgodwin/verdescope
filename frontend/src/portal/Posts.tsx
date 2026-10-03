import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { api, useApi } from '../lib/api';
import { fmtDate, today } from '../lib/format';
import type { Post } from '../lib/types';
import { ErrorBox, ImagePicker, Loading, Modal, useToast } from './ui';

export default function Posts() {
  const { data: posts, error, reload } = useApi<Post[]>('/posts');
  const [params, setParams] = useSearchParams();
  const [edit, setEdit] = useState<Post | 'new' | null>(null);
  const [q, setQ] = useState('');
  const toast = useToast();
  useEffect(() => { if (params.get('new')) { setEdit('new'); setParams({}, { replace: true }); } }, [params, setParams]);

  async function del(p: Post) {
    if (!confirm(`Delete “${p.title}”?`)) return;
    try { await api(`/posts/${p.id}`, { method: 'DELETE' }); toast('Post deleted'); reload(); } catch (e) { toast((e as Error).message, true); }
  }
  if (error) return <ErrorBox msg={error} />;
  const shown = (posts ?? []).filter((p) => (p.title + p.category).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="toolbar"><input className="inp" placeholder="Search posts…" value={q} onChange={(e) => setQ(e.target.value)} /><span className="sp" />
        <button className="btn primary" onClick={() => setEdit('new')}><Icon name="plus" /> New post</button></div>
      {!posts ? <Loading /> : (
        <div className="card"><div className="tbl-wrap"><table className="tbl">
          <thead><tr><th /><th>Title</th><th>Category</th><th>Status</th><th>Date</th><th /></tr></thead>
          <tbody>{shown.map((p) => (
            <tr key={p.id}>
              <td style={{ width: 70 }}><img className="thumb-sm" src={p.image || undefined} alt="" /></td>
              <td><div className="t-title">{p.title}</div><div className="t-sub">{p.author}</div></td>
              <td className="t-sub">{p.category}</td>
              <td>{p.status === 'published' ? <span className="st good">Published</span> : <span className="st warn">Draft</span>}</td>
              <td className="t-sub">{fmtDate(p.date)}</td>
              <td className="actions">
                {p.status === 'published' && <a className="icon-btn" title="View on site" target="_blank" rel="noreferrer" href={`/blog/${p.slug}`}><Icon name="eye" /></a>}
                <button className="icon-btn" title="Edit" onClick={() => setEdit(p)}><Icon name="edit" /></button>
                <button className="icon-btn danger" title="Delete" onClick={() => del(p)}><Icon name="trash" /></button>
              </td>
            </tr>
          ))}</tbody>
        </table></div></div>
      )}
      {edit && <PostEditor post={edit === 'new' ? null : edit} categories={[...new Set((posts ?? []).map((p) => p.category))]} onClose={() => setEdit(null)} onSaved={reload} />}
    </>
  );
}

function PostEditor({ post, categories, onClose, onSaved }: { post: Post | null; categories: string[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const p = post ?? { title: '', category: '', date: today(), status: 'draft', author: '', image: '/assets/img/stock/hero-mara.jpg', excerpt: '', body: '' };
  return (
    <Modal title={post ? 'Edit post' : 'New post'} wide saveLabel={post ? 'Save changes' : 'Create post'} onClose={onClose} onSubmit={async (fd) => {
      const body = Object.fromEntries(fd);
      await api(post ? `/posts/${post.id}` : '/posts', { method: post ? 'PUT' : 'POST', body });
      toast(post ? 'Post updated' : 'Post created'); onSaved();
    }}>
      <div className="field"><label>Title</label><input name="title" required defaultValue={p.title} /></div>
      <div className="row3">
        <div className="field"><label>Category</label><input name="category" list="catList" required defaultValue={p.category} /><datalist id="catList">{categories.map((c) => <option key={c} value={c} />)}</datalist></div>
        <div className="field"><label>Publish date</label><input type="date" name="date" required defaultValue={p.date} /></div>
        <div className="field"><label>Status</label><select name="status" defaultValue={p.status}><option value="draft">Draft</option><option value="published">Published</option></select></div>
      </div>
      <div className="row2"><div className="field"><label>Author</label><input name="author" defaultValue={p.author} placeholder="Defaults to your name" /></div><div /></div>
      <ImagePicker name="image" value={p.image} />
      <div className="field"><label>Excerpt</label><textarea name="excerpt" style={{ minHeight: 70 }} required defaultValue={p.excerpt} /></div>
      <div className="field"><label>Body</label><textarea name="body" style={{ minHeight: 260 }} required defaultValue={p.body} />
        <div className="hint">Separate paragraphs with a blank line. Start a line with “## ” for a heading and “- ” for bullet points.</div></div>
    </Modal>
  );
}
