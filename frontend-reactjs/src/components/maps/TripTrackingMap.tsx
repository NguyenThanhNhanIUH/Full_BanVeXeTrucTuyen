import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../../api/client';

export type TripTrackingData = {
  chuyenId: number;
  diemDi: string;
  diemDen: string;
  loaiXe: string;
  bienSo: string;
  diemDiLat: number;
  diemDiLng: number;
  diemDenLat: number;
  diemDenLng: number;
  xeLat: number;
  xeLng: number;
  tienDoPhanTram: number;
  trangThai: string;
  trangThaiHienThi: string;
  cheDoDemo?: boolean;
};

type ApiResponse<T> = { code: number; message: string; data: T };

const makeIcon = (html: string, className: string) =>
  L.divIcon({
    className,
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const originIcon = makeIcon('<div class="h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow"></div>', 'trip-map-origin');
const destIcon = makeIcon('<div class="h-4 w-4 rounded-full border-2 border-white bg-[#ef5222] shadow"></div>', 'trip-map-dest');
const busIcon = makeIcon(
  '<div class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#2563eb] text-sm text-white shadow-lg">🚌</div>',
  'trip-map-bus',
);

type TripTrackingMapProps = {
  tripId: number;
  active: boolean;
};

const TripTrackingMap = ({ tripId, active }: TripTrackingMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const demoRef = useRef(false);
  const [tracking, setTracking] = useState<TripTrackingData | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [forceDemo, setForceDemo] = useState(false);

  const destroyMap = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    routeRef.current = null;
    busMarkerRef.current = null;
    originMarkerRef.current = null;
    destMarkerRef.current = null;
  }, []);

  const fetchTracking = useCallback(
    async (demo = false) => {
      const res = await api.get<ApiResponse<TripTrackingData>>(`/api/catalog/trips/${tripId}/tracking`, { params: { demo } });
      if (res.data?.data) {
        setTracking(res.data.data);
        demoRef.current = Boolean(res.data.data.cheDoDemo || demo);
        setError('');
      }
    },
    [tripId],
  );

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setInitialLoading(true);
    setError('');

    void fetchTracking(forceDemo)
      .catch(() => {
        if (!cancelled) setError('Không tải được vị trí xe.');
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });

    const timer = window.setInterval(() => {
      void fetchTracking(forceDemo || demoRef.current).catch(() => undefined);
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [tripId, active, forceDemo, fetchTracking]);

  useEffect(() => {
    if (!active) {
      destroyMap();
      return;
    }
    if (!containerRef.current || !tracking) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;
    const origin = L.latLng(tracking.diemDiLat, tracking.diemDiLng);
    const dest = L.latLng(tracking.diemDenLat, tracking.diemDenLng);
    const bus = L.latLng(tracking.xeLat, tracking.xeLng);

    if (!routeRef.current) {
      routeRef.current = L.polyline([origin, dest], { color: '#ef5222', weight: 4, opacity: 0.75, dashArray: '8 8' }).addTo(map);
    } else {
      routeRef.current.setLatLngs([origin, dest]);
    }

    if (!originMarkerRef.current) {
      originMarkerRef.current = L.marker(origin, { icon: originIcon }).addTo(map).bindTooltip('Điểm đi', { permanent: false });
    } else {
      originMarkerRef.current.setLatLng(origin);
    }

    if (!destMarkerRef.current) {
      destMarkerRef.current = L.marker(dest, { icon: destIcon }).addTo(map).bindTooltip('Điểm đến', { permanent: false });
    } else {
      destMarkerRef.current.setLatLng(dest);
    }

    if (!busMarkerRef.current) {
      busMarkerRef.current = L.marker(bus, { icon: busIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindTooltip(`${tracking.bienSo || 'Xe'} • ${tracking.trangThaiHienThi}`, { permanent: false });
    } else {
      busMarkerRef.current.setLatLng(bus);
      busMarkerRef.current.setTooltipContent(`${tracking.bienSo || 'Xe'} • ${tracking.trangThaiHienThi}`);
    }

    map.fitBounds(L.latLngBounds([origin, dest, bus]).pad(0.2));
    window.requestAnimationFrame(() => {
      map.invalidateSize();
    });
  }, [active, tracking, destroyMap]);

  useEffect(() => () => destroyMap(), [destroyMap]);

  if (initialLoading) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500">Đang tải bản đồ theo dõi...</p>
        <div className="h-72 w-full animate-pulse rounded-xl border border-gray-200 bg-gray-100 sm:h-80" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!tracking) {
    return <p className="text-sm text-gray-500">Chưa có dữ liệu theo dõi cho chuyến này.</p>;
  }

  const isDemo = tracking.cheDoDemo || forceDemo;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">{tracking.trangThaiHienThi}</span>
        <span className="text-gray-600">
          Tiến độ: <strong>{tracking.tienDoPhanTram}%</strong>
        </span>
        {tracking.bienSo ? (
          <span className="text-gray-600">
            Biển số: <strong className="font-mono">{tracking.bienSo}</strong>
          </span>
        ) : null}
        {tracking.loaiXe ? (
          <span className="text-gray-600">
            Loại xe: <strong>{tracking.loaiXe}</strong>
          </span>
        ) : null}
        {!isDemo && tracking.trangThai === 'HOAN_THANH' ? (
          <button
            type="button"
            onClick={() => setForceDemo(true)}
            className="rounded-full border border-[#ef5222]/40 px-3 py-1 text-xs font-semibold text-[#ef5222] hover:bg-[#fff2ed]"
          >
            Phát lại demo
          </button>
        ) : null}
      </div>
      <div ref={containerRef} className="trip-tracking-map h-72 w-full rounded-xl border border-gray-200 sm:h-80" />
      <p className="text-xs text-gray-500">
        Cập nhật mỗi 3 giây · {tracking.diemDi} → {tracking.diemDen}
      </p>
    </div>
  );
};

export default TripTrackingMap;
