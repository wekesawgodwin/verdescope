import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { api, useApi } from '../lib/api';
import type { InquiryStatus } from '../lib/types';

// ---------- Toasts ----------
const ToastCtx = createContext<(msg: string, error?: boolean) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; error: boolean; id: number } | null>(null);
  const show = useCallback((msg: string, error = false) => setT({ msg, error, id: Date.now() }), []);
  useEffect(() => { if (!t) return; const h = setTimeout(() => setT(null), 3200); return () => clearTimeout(h); }, [t]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className={'toast' + (t ? ' show' : '')} role="status" style={t?.error ? { borderColor: 'var(--bad)' } : undefined}>
        {t && <><Icon name={t.error ? 'close' : 'check'} /><span>{t.msg}</span></>}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Modal (wraps an uncontrolled form; onSubmit gets FormData) ----------
export function Modal({ title, wide, onClose, onSubmit, saveLabel = 'Save', children }: {
  title: string; wide?: boolean; onClose: () => void; onSubmit?: (fd: FormData) => Promise<unknown> | unknown; saveLabel?: string; children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    box.current?.querySelector<HTMLElement>('input:not([type=hidden]), textarea, select')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!onSubmit) return onClose();
    setBusy(true); setErr('');
    try { const r = await onSubmit(new FormData(e.currentTarget)); if (r !== false) onClose(); }
    catch (x) { setErr((x as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <div className="modal open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal-box' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title} ref={box}>
        <div className="modal-h"><h3>{title}</h3><button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></div>
        <form onSubmit={submit}>
          <div className="modal-b">{children}{err && <div className="err" role="alert">{err}</div>}</div>
          <div className="modal-f"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>{busy ? 'Saving…' : saveLabel}</button></div>
        </form>
      </div>
    </div>
  );
}

// ---------- Status pills (text + colour, never colour alone) ----------
export const STATUS: Record<InquiryStatus, [string, string]> = { new: ['New', 'info'], 'in-progress': ['In progress', 'warn'], replied: ['Replied', 'good'], closed: ['Closed', 'mute'] };
export const StatusPill = ({ s }: { s: InquiryStatus }) => { const [l, c] = STATUS[s] || [s, 'mute']; return <span className={`st ${c}`}>{l}</span>; };
export const projClass = (s: string) => ({ 'In progress': 'info', 'Report review': 'warn', Planning: 'mute', Completed: 'good' }[s] || 'mute');

// ---------- Image picker: library or upload ----------
export function ImagePicker({ name, value, label = 'Cover image' }: { name: string; value: string; label?: string }) {
  const [v, setV] = useState(value);
  const [busy, setBusy] = useState(false);
  const { data: lib } = useApi<string[]>('/uploads/library');
  const toast = useToast();
  async function upload(f: File) {
    const fd = new FormData(); fd.append('file', f);
    setBusy(true);
    try { setV((await api<{ url: string }>('/uploads', { method: 'POST', form: fd })).url); }
    catch (e) { toast((e as Error).message, true); }
    finally { setBusy(false); }
  }
  return (
    <div className="field"><label>{label}</label>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'start' }}>
        <img src={v || undefined} alt="" style={{ width: 120, aspectRatio: '4/3', objectFit: 'cover', background: 'var(--bg-2)', border: '1px solid var(--line)' }} />
        <div>
          <select className="inp" style={{ marginBottom: 8 }} value={lib?.includes(v) ? v : ''} onChange={(e) => e.target.value && setV(e.target.value)}>
            <option value="">Choose from library…</option>
            {lib?.map((s) => <option key={s} value={s}>{s.split('/').pop()}</option>)}
          </select>
          <label className="btn sm" style={{ cursor: 'pointer' }}><Icon name="plus" /> {busy ? 'Uploading…' : 'Upload image'}
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          <input type="hidden" name={name} value={v} />
        </div>
      </div>
    </div>
  );
}

// ---------- Charts: single series, one hue, hover tooltip + table view ----------
type Datum = { label: string; value: number; full?: string };
const niceMax = (v: number) => { const p = Math.pow(10, Math.floor(Math.log10(v || 1))); const r = v / p; return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * p; };
const roundTop = (x: number, y: number, w: number, h: number, r: number) => { r = Math.min(r, h, w / 2); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; };
const roundRight = (x: number, y: number, w: number, h: number, r: number) => { r = Math.min(r, w, h / 2); return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`; };

function ChartFrame({ data, label, children, tip }: { data: Datum[]; label: string; children: ReactNode; tip: { i: number; x: number; y: number } | null }) {
  const [table, setTable] = useState(false);
  return (
    <>
      {!table && <div className="chart">{children}
        <div className="tip" style={tip ? { left: tip.x + '%', top: tip.y + '%', opacity: 1 } : undefined}>
          {tip && <><b>{data[tip.i].value.toLocaleString()}</b><span>{data[tip.i].full || data[tip.i].label}</span></>}
        </div></div>}
      <div style={{ marginTop: 8, textAlign: 'right' }}><button className="table-toggle" onClick={() => setTable(!table)}>{table ? 'View as chart' : 'View as table'}</button></div>
      {table && <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Category</th><th style={{ textAlign: 'right' }}>{label}</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.full || d.label}><td>{d.full || d.label}</td><td style={{ textAlign: 'right' }}>{d.value.toLocaleString()}</td></tr>)}</tbody></table></div>}
    </>
  );
}

export function BarChart({ data, label, fadeLast }: { data: Datum[]; label: string; fadeLast?: boolean }) {
  const [tip, setTip] = useState<{ i: number; x: number; y: number } | null>(null);
  const W = 640, H = 240, pl = 40, pr = 8, pt = 14, pb = 26;
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const cw = (W - pl - pr) / data.length, bw = Math.min(28, cw * 0.62);
  const y = (v: number) => pt + (H - pt - pb) * (1 - v / max);
  return (
    <ChartFrame data={data} label={label} tip={tip}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label} bar chart`} onMouseLeave={() => setTip(null)}>
        {[0, 1, 2, 3, 4].map((k) => { const v = (max / 4) * k, yy = y(v); return <g key={k}><line className="gridline" x1={pl} x2={W - pr} y1={yy} y2={yy} /><text className="axis-lbl" x={pl - 8} y={yy + 4} textAnchor="end">{v >= 1000 ? `${v / 1000}k` : v}</text></g>; })}
        {data.map((d, i) => {
          const x = pl + cw * i + (cw - bw) / 2, yy = y(d.value);
          return (
            <g key={i} onMouseEnter={() => setTip({ i, x: ((pl + cw * i + cw / 2) / W) * 100, y: (yy / H) * 100 })}>
              <rect className="hit" x={pl + cw * i} y={pt} width={cw} height={H - pt - pb} />
              <path className={'bar' + (tip?.i === i ? ' hover' : '')} d={roundTop(x, yy, bw, Math.max(H - pb - yy, 0.5), 4)} opacity={fadeLast && i === data.length - 1 ? 0.45 : 1} />
              <text className="axis-lbl" x={x + bw / 2} y={H - 8} textAnchor="middle">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </ChartFrame>
  );
}

export function HBarChart({ data, label }: { data: Datum[]; label: string }) {
  const [tip, setTip] = useState<{ i: number; x: number; y: number } | null>(null);
  const rowH = 34, W = 640, pl = 230, pr = 40, H = data.length * rowH + 6;
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <div className="empty">No data yet.</div>;
  return (
    <ChartFrame data={data} label={label} tip={tip}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label} bar chart`} onMouseLeave={() => setTip(null)}>
        {data.map((d, i) => {
          const yy = 4 + i * rowH, w = Math.max(2, ((W - pl - pr) * d.value) / max);
          return (
            <g key={i} onMouseEnter={() => setTip({ i, x: ((pl + w) / W) * 100, y: ((yy + 7) / H) * 100 })}>
              <rect className="hit" x={0} y={yy} width={W} height={rowH - 4} />
              <path className={'bar' + (tip?.i === i ? ' hover' : '')} d={roundRight(pl, yy + 7, w, rowH - 18, 4)} />
              <text className="axis-lbl" x={pl - 12} y={yy + rowH / 2 + 2} textAnchor="end">{d.label.length > 34 ? d.label.slice(0, 33) + '…' : d.label}</text>
              <text className="val-lbl" x={pl + w + 8} y={yy + rowH / 2 + 2}>{d.value}</text>
            </g>
          );
        })}
      </svg>
    </ChartFrame>
  );
}

export const Loading = () => <div className="skeleton" style={{ minHeight: 240 }} />;
export const ErrorBox = ({ msg }: { msg: string }) => <div className="error-box">{msg}</div>;
