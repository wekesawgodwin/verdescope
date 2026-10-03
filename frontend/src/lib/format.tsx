import type { ReactNode } from 'react';

export const fmtDate = (s: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(+d) ? s : d.toLocaleDateString('en-GB', opts);
};

export const fmtTime = (s: string) => {
  const d = new Date(s);
  return isNaN(+d) ? s : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const ago = (s: string | null) => {
  if (!s) return 'Never';
  const sec = (Date.now() - +new Date(s)) / 1000;
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d ago`;
  return fmtDate(s);
};

export const initials = (n: string) =>
  n.replace(/^(Dr\.?|Eng\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, '').replace(/^(Eng\.?)\s+/i, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export const fileSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export const today = () => new Date().toISOString().slice(0, 10);

/** Tiny markdown: paragraphs, "## " headings and "- " lists. Renders React nodes (no innerHTML). */
export function Markdown({ src }: { src: string }) {
  const blocks = (src || '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const out: ReactNode[] = [];
  blocks.forEach((b, i) => {
    const lines = b.split('\n');
    if (lines.every((l) => l.startsWith('- '))) {
      out.push(<ul key={i}>{lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>);
    } else if (lines[0].startsWith('## ')) {
      out.push(<h2 key={i}>{lines[0].slice(3)}</h2>);
      const rest = lines.slice(1).join(' ').trim();
      if (rest) out.push(<p key={i + 'p'}>{rest}</p>);
    } else {
      out.push(<p key={i}>{lines.map((l, j) => (j ? [<br key={j} />, l] : l))}</p>);
    }
  });
  return <>{out}</>;
}
