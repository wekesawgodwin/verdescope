import { useCallback, useEffect, useState } from 'react';

const TOKEN_KEY = 'vs_token';

export const token = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* private mode */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } },
};

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

type Opts = { method?: string; body?: unknown; form?: FormData };

export async function api<T = unknown>(path: string, { method = 'GET', body, form }: Opts = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const t = token.get();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch('/api' + path, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  } catch {
    throw new ApiError('You appear to be offline. Check your connection and try again.', 0);
  }
  if (res.status === 401 && t) {
    token.clear();
    window.dispatchEvent(new Event('vs:logout'));
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const d = data?.detail;
    const msg = typeof d === 'string' ? d : Array.isArray(d) ? d.map((x: { loc?: string[]; msg: string }) => `${x.loc?.slice(-1)[0] ?? ''}: ${x.msg}`).join('; ') : res.statusText;
    throw new ApiError(msg || 'Request failed', res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Authenticated file download (documents, exports). */
export async function downloadFile(path: string, fallbackName: string) {
  const t = token.get();
  const res = await fetch('/api' + path, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
  if (!res.ok) throw new ApiError('Download failed', res.status);
  const cd = res.headers.get('Content-Disposition') || '';
  const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(await res.blob());
  a.download = m ? decodeURIComponent(m[1]) : fallbackName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try { setData(await api<T>(path)); setError(null); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return { data, setData, error, loading, reload: load };
}
