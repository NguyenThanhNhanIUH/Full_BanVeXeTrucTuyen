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
  const [tracking, setTracking] = useState<TripTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forceDemo, setForceDemo] = useState(false);

  const fetchTracking = useCallback(
    (demo = false) =>
      api
        .get<ApiResponse<TripTrackingData>>(`/api/catalog/trips/${tripId}/tracking`, { params: { demo } })
        .then((res) => {
          if (res.data?.data) {
            setTracking(res.data.data);
            setError('');
          }
        })
        .catch(() => setError('Không tải được vị trí xe.')),
    [tripId],
  );

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);

    void fetchTracking(forceDemo).finally(() => {
      if (!cancelled) setLoading(false);
    });

    const intervalMs = forceDemo || tracking?.cheDoDemo ? 3000 : 15000;
    const timer = window.setInterval(() => {
      void fetchTracking(forceDemo);
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [tripId, active, forceDemo, fetchTracking, tracking?.cheDoDemo]);

  useEffect(() => {
    if (!active || !containerRef.current || !tracking) return;

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

    return undefined;
  }, [active, tracking]);

  useEffect(() => {
    if (active) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      routeRef.current = null;
      busMarkerRef.current = null;
      originMarkerRef.current = null;
      destMarkerRef.current = null;
    }
  }, [active]);

  useEffect(
    () => () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    },
    [],
  );

  if (loading) {
    return <p className="text-sm text-gray-500">Đang tải bản đồ theo dõi...</p>;
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
      {isDemo ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <strong>Chế độ demo:</strong> chuyến trong DB chưa tới giờ chạy thật — xe mô phỏng di chuyển trên tuyến (~2 phút/vòng) để bạn báo cáo thử nghiệm.
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded-full px-3 py-1 font-semibold ${isDemo ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'}`}>
          {tracking.trangThaiHienThi}
        </span>
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
      <div ref={containerRef} className="h-72 w-full overflow-hidden rounded-xl border border-gray-200 sm:h-80" />
      <p className="text-xs text-gray-500">
        {isDemo
          ? 'Demo cập nhật mỗi 3 giây. Khi tới đúng ngày/giờ chạy thật, hệ thống tự chuyển sang theo dõi thực.'
          : 'Vị trí ước tính theo lịch chuyến, cập nhật mỗi 15 giây.'}{' '}
        {tracking.diemDi} → {tracking.diemDen}.
      </p>
    </div>
  );
};

export default TripTrackingMap;
