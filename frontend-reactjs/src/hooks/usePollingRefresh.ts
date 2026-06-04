import { useEffect, useRef } from 'react';
import { REALTIME_POLL_MS } from '../constants/realtimePoll';

export function usePollingRefresh(
  refresh: (options?: { silent?: boolean }) => void | Promise<void>,
  intervalMs: number = REALTIME_POLL_MS,
  enabled = true,
) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled) return;
    const tick = (silent: boolean) => void refreshRef.current({ silent });
    const onVis = () => {
      if (document.visibilityState === 'visible') tick(true);
    };
    document.addEventListener('visibilitychange', onVis);
    const timer = window.setInterval(() => tick(true), intervalMs);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.clearInterval(timer);
    };
  }, [intervalMs, enabled]);
}
