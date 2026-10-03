import { useState } from 'react';
import { useApi } from '../lib/api';
import { fmtTime } from '../lib/format';
import type { ActivityItem } from '../lib/types';
import { ErrorBox, Loading } from './ui';

export default function Activity() {
  const { data, error } = useApi<ActivityItem[]>('/activity');
  const [q, setQ] = useState('');
  if (error) return <ErrorBox msg={error} />;
  if (!data) return <Loading />;
  const shown = data.filter((a) => (a.user_name + a.action).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="toolbar"><input className="inp" placeholder="Filter activity…" value={q} onChange={(e) => setQ(e.target.value)} /><span className="sp" /><span style={{ color: 'var(--muted)', fontSize: 13 }}>{shown.length} entries</span></div>
      <div className="card"><div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>When</th><th>User</th><th>Action</th></tr></thead>
        <tbody>{shown.map((a) => <tr key={a.id}><td className="t-sub" style={{ whiteSpace: 'nowrap' }}>{fmtTime(a.created_at)}</td><td>{a.user_name}</td><td className="t-sub">{a.action}</td></tr>)}</tbody>
      </table></div></div>
    </>
  );
}
