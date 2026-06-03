import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import type { SeatMapResponse } from '../utils/seatMapLayout';
import { getApiBaseUrl, getSeatHoldToken } from '../utils/seatHold';

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

const applyMapUpdate = (
  map: SeatMapResponse,
  confirmedHolds: Set<string>,
  onConflict?: (seatCode: string) => void,
) => {
  for (const seat of map.ghe) {
    if (seat.dangGiuCho && !confirmedHolds.has(seat.maGhe)) {
      onConflict?.(seat.maGhe);
    }
  }
};

const restoreMyHolds = (map: SeatMapResponse, confirmedHolds: Set<string>) => {
  const mine = map.maGheCuaBan ?? [];
  mine.forEach((seatCode) => confirmedHolds.add(seatCode));
  return mine;
};

export function useRealtimeSeatMap(chuyenId?: number) {
  const [map, setMap] = useState<SeatMapResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(chuyenId));
  const [myHeldSeats, setMyHeldSeats] = useState<string[]>([]);
  const confirmedHoldsRef = useRef<Set<string>>(new Set());
  const holdToken = useMemo(() => (chuyenId ? getSeatHoldToken(chuyenId) : ''), [chuyenId]);

  const syncMap = useCallback(
    (nextMap: SeatMapResponse, notifyConflict = false, restoreMine = false) => {
      if (restoreMine) {
        const mine = restoreMyHolds(nextMap, confirmedHoldsRef.current);
        setMyHeldSeats(mine);
      } else if (nextMap.maGheCuaBan?.length) {
        nextMap.maGheCuaBan.forEach((seatCode) => confirmedHoldsRef.current.add(seatCode));
        setMyHeldSeats((prev) => [...new Set([...prev, ...nextMap.maGheCuaBan!])]);
      }
      if (notifyConflict) {
        applyMapUpdate(nextMap, confirmedHoldsRef.current, (seatCode) => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('banvexe:seat-lost', { detail: { chuyenId, seatCode } }));
          }
        });
      }
      setMap(nextMap);
    },
    [chuyenId],
  );

  useEffect(() => {
    if (!chuyenId) return;
    let active = true;
    let eventSource: EventSource | null = null;
    let reconnectTimer: number | undefined;
    let pollTimer: number | undefined;

    confirmedHoldsRef.current.clear();
    setMyHeldSeats([]);

    const fetchMap = (restoreMine = false) =>
      api
        .get<ApiResponse<SeatMapResponse>>(`/api/catalog/trips/${chuyenId}/seats`, {
          params: { holdToken },
        })
        .then((res) => {
          if (active && res.data?.data) syncMap(res.data.data, !restoreMine, restoreMine);
        })
        .catch(() => undefined);

    void fetchMap(true).finally(() => {
      if (active) setLoading(false);
    });

    pollTimer = window.setInterval(() => {
      void fetchMap(false);
    }, 2000);

    const connectStream = () => {
      const base = getApiBaseUrl();
      if (!base || !active) return;
      eventSource?.close();
      eventSource = new EventSource(`${base}/api/catalog/trips/${chuyenId}/seats/stream`);
      eventSource.addEventListener('seats', (event) => {
        try {
          const parsed = JSON.parse(String(event.data)) as SeatMapResponse;
          if (active) syncMap(parsed, true, false);
        } catch {
          // ignore malformed SSE payload
        }
      });
      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        if (active) {
          reconnectTimer = window.setTimeout(connectStream, 2000);
        }
      };
    };

    connectStream();

    return () => {
      active = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (pollTimer) window.clearInterval(pollTimer);
      eventSource?.close();
    };
  }, [chuyenId, holdToken, syncMap]);

  const holdSeat = useCallback(
    async (maGhe: string) => {
      if (!chuyenId) return;
      const res = await api.post<ApiResponse<SeatMapResponse>>(`/api/catalog/trips/${chuyenId}/seats/hold`, {
        holdToken,
        maGhe,
      });
      confirmedHoldsRef.current.add(maGhe);
      setMyHeldSeats((prev) => [...new Set([...prev, maGhe])]);
      if (res.data?.data) syncMap(res.data.data);
    },
    [chuyenId, holdToken, syncMap],
  );

  const releaseSeat = useCallback(
    async (maGhe: string) => {
      if (!chuyenId) return;
      const res = await api.post<ApiResponse<SeatMapResponse>>(`/api/catalog/trips/${chuyenId}/seats/release`, {
        holdToken,
        maGhe,
      });
      confirmedHoldsRef.current.delete(maGhe);
      setMyHeldSeats((prev) => prev.filter((s) => s !== maGhe));
      if (res.data?.data) syncMap(res.data.data);
    },
    [chuyenId, holdToken, syncMap],
  );

  return { map, loading, holdToken, holdSeat, releaseSeat, myHeldSeats, confirmedHoldsRef };
};
