import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let deferred: BeforeInstallPromptEvent | null = null;
const subs = new Set<() => void>();
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BeforeInstallPromptEvent; subs.forEach((f) => f()); });
window.addEventListener('appinstalled', () => { deferred = null; subs.forEach((f) => f()); });

/** Returns an install() function when the browser offers PWA installation, otherwise null. */
export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  if (!deferred) return null;
  return async () => { await deferred?.prompt(); deferred = null; subs.forEach((f) => f()); };
}
