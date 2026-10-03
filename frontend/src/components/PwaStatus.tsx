import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** Offline banner + "new version" prompt for the installed app. */
export default function PwaStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Check for a new deploy every hour while the app is open
      if (reg) setInterval(() => reg.update(), 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  return (
    <>
      {!online && <div className="offline-bar" role="status">You are offline. Showing saved content; forms will work again when you reconnect.</div>}
      {needRefresh && (
        <div className="update-bar" role="status">
          A new version is available.
          <button onClick={() => updateServiceWorker(true)}>Update</button>
          <button onClick={() => setNeedRefresh(false)} style={{ background: 'transparent', color: '#9cab9f' }}>Later</button>
        </div>
      )}
    </>
  );
}
