import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let removeNetworkListener: (() => Promise<void>) | null = null;
    if (Capacitor.isNativePlatform()) {
      Network.getStatus()
        .then((status) => {
          setIsOnline(Boolean(status.connected));
        })
        .catch(() => {
          // Ignore plugin fallback errors
        });

      Network.addListener('networkStatusChange', (status) => {
        setIsOnline(Boolean(status.connected));
      })
        .then((handle) => {
          removeNetworkListener = () => handle.remove();
        })
        .catch(() => {
          // Ignore listener setup errors
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (removeNetworkListener) {
        removeNetworkListener().catch(() => {});
      }
    };
  }, []);

  return isOnline;
}
