import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { SeatMapResponse } from '../utils/seatMapLayout';
import { getApiBaseUrl, getSeatHoldToken } from '../utils/seatHold';

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

export function useRealtimeSeatMap(chuyenId?: number) {
  const [map, setMap] = useState<SeatMapResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(chuyenId));
  const holdToken = useMemo(() => (chuyenId ? getSeatHoldToken(chuyenId) : ''), [chuyenId]);

  useEffect(() => {
    if (!chuyenId) return;
    let active = true;

    api
      .get<ApiResponse<SeatMapResponse>>(`/api/catalog/trips/${chuyenId}/seats`)
      .then((res) => {
        if (active) setMap(res.data?.data ?? null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const base = getApiBaseUrl();
    const eventSource = base ? new EventSource(`${base}/api/catalog/trips/${chuyenId}/seats/stream`) : null;
    if (eventSource) {
      eventSource.addEventListener('seats', (event) => {
        try {
          const parsed = JSON.parse(String(event.data)) as SeatMapResponse;
          if (active) setMap(parsed);
        } catch {
          // ignore malformed SSE payload
        }
      });
      eventSource.onerror = () => {
        eventSource.close();
      };
    }

    return () => {
      active = false;
      eventSource?.close();
      void api.post<ApiResponse<SeatMapResponse>>(`/api/catalog/trips/${chuyenId}/seats/release`, { holdToken });
    };
  }, [chuyenId, holdToken]);

  const holdSeat = useCallback(
    async (maGhe: string) => {
      if (!chuyenId) return;
      const res = await api.post<ApiResponse<SeatMapResponse>>(`/api/catalog/trips/${chuyenId}/seats/hold`, {
        holdToken,
        maGhe,
      });
      if (res.data?.data) setMap(res.data.data);
    },
    [chuyenId, holdToken],
  );

  const releaseSeat = useCallback(
    async (maGhe: string) => {
      if (!chuyenId) return;
      const res = await api.post<ApiResponse<SeatMapResponse>>(`/api/catalog/trips/${chuyenId}/seats/release`, {
        holdToken,
        maGhe,
      });
      if (res.data?.data) setMap(res.data.data);
    },
    [chuyenId, holdToken],
  );

  return { map, loading, holdToken, holdSeat, releaseSeat };
}
