import { useEffect, useState } from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import axios from 'axios';
import bannerImage from '../../assets/banner.png';
import tphcmImage from '../../assets/TPHCM.png';
import daLatImage from '../../assets/DaLat.png';
import daNangImage from '../../assets/DaNang.png';
import km1 from '../../assets/KM1.png';
import km2 from '../../assets/KM2.png';
import km3 from '../../assets/KM3.png';
import km4 from '../../assets/KM4.png';
import km5 from '../../assets/KM5.png';
import km6 from '../../assets/KM6.png';

type TripSummary = {
  id: number;
  tenTuyen: string;
  diemDi: string;
  diemDen: string;
  ngayDi: string;
  gioDi: string;
  gioDenDuKien?: string;
  thoiGianDuKienPhut?: number;
  khoangCach?: number;
  giaVe: number;
  loaiXe: string;
  soGheTrong: number;
};

type RouteSummary = {
  tenTuyen: string;
  diemDi: string;
  diemDen: string;
  thoiGianDuKien?: number;
};

type SeatStatus = {
  maGhe: string;
  daBan: boolean;
};

type SeatMapResponse = {
  tongSoGhe: number;
  ghe: SeatStatus[];
};

type UiSeat = {
  maGhe: string;
  daBan: boolean;
};

type SeatLayout = {
  tangDuoi?: UiSeat[][];
  tangTren?: UiSeat[][];
  single?: UiSeat[][];
  singleType?: 'limousine' | 'seat';
};

type SearchCriteria = {
  diemDi: string;
  diemDen: string;
  ngayDi: string;
  ngayVe: string;
  soVe: string;
  tripType: 'one-way' | 'round-trip';
};

type SelectedTripInfo = {
  id: number;
  tenTuyen: string;
  diemDi: string;
  diemDen: string;
  ngayDi: string;
  gioDi: string;
  gioDenDuKien?: string;
  thoiGianDuKienPhut?: number;
  khoangCach?: number;
};

type TimeFilterKey = 'early' | 'morning' | 'afternoon' | 'evening';
type VehicleFilterKey = 'ghe' | 'giuong' | 'limousine';

const HomePage = () => {
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [diemDi, setDiemDi] = useState('');
  const [diemDen, setDiemDen] = useState('');
  const [ngayDi, setNgayDi] = useState('');
  const [ngayVe, setNgayVe] = useState('');
  const [soVe, setSoVe] = useState('1');
  const [dangTimChuyen, setDangTimChuyen] = useState(false);
  const [goiYDiemDi, setGoiYDiemDi] = useState<string[]>([]);
  const [goiYDiemDen, setGoiYDiemDen] = useState<string[]>([]);
  const [danhSachChuyen, setDanhSachChuyen] = useState<TripSummary[]>([]);
  const [daTimKiem, setDaTimKiem] = useState(false);
  const [thongBaoTimKiem, setThongBaoTimKiem] = useState('');
  const [tieuChiDaTim, setTieuChiDaTim] = useState<SearchCriteria | null>(null);
  const [selectedTripInfo, setSelectedTripInfo] = useState<SelectedTripInfo | null>(null);
  const [timeFilters, setTimeFilters] = useState<Record<TimeFilterKey, boolean>>({
    early: false,
    morning: false,
    afternoon: false,
    evening: false,
  });
  const [vehicleFilters, setVehicleFilters] = useState<Record<VehicleFilterKey, boolean>>({
    ghe: false,
    giuong: false,
    limousine: false,
  });
  const [seatRowFilters, setSeatRowFilters] = useState({
    front: false,
    middle: false,
    back: false,
  });
  const [deckFilters, setDeckFilters] = useState({
    top: false,
    bottom: false,
  });
  const [tripDangChonGhe, setTripDangChonGhe] = useState<number | null>(null);
  const [dangTaiSoDoGhe, setDangTaiSoDoGhe] = useState(false);
  const [soDoGheTheoChuyen, setSoDoGheTheoChuyen] = useState<Record<number, SeatMapResponse>>({});
  const [gheDangChonTheoChuyen, setGheDangChonTheoChuyen] = useState<Record<number, string[]>>({});
  const [routeDurationCache, setRouteDurationCache] = useState<Record<string, number>>({});

  const promoSlides = [
    [
      { title: 'Ưu đãi tuyến Đà Lạt', image: km1 },
      { title: 'Đặt vé online - giảm ngay', image: km2 },
      { title: 'Giảm thời gian trung chuyển', image: km3 },
    ],
    [
      { title: 'Mua vé sớm - giá tốt', image: km4 },
      { title: 'Ưu đãi cuối tuần', image: km5 },
      { title: 'Giảm thêm khi thanh toán online', image: km6 },
    ],
  ];

  const [activePromo, setActivePromo] = useState(0);
  const routeCards = [
    {
      title: 'Tuyến xe từ Tp Hồ Chí Minh',
      image: tphcmImage,
      imageAlt: 'Tp Hồ Chí Minh',
      destinations: [
        { name: 'Đà Lạt', distance: '310km - 480 giờ', price: '290.000đ' },
        { name: 'Cần Thơ', distance: '170km - 310 giờ', price: '165.000đ' },
      ],
    },
    {
      title: 'Tuyến xe từ Đà Lạt',
      image: daLatImage,
      imageAlt: 'Đà Lạt',
      destinations: [
        { name: 'Tp Hồ Chí Minh', distance: '310km - 480 giờ', price: '290.000đ' },
        { name: 'Đà Nẵng', distance: '700km - 840 giờ', price: '430.000đ' },
      ],
    },
    {
      title: 'Tuyến xe từ Đà Nẵng',
      image: daNangImage,
      imageAlt: 'Đà Nẵng',
      destinations: [
        { name: 'Nha Trang', distance: '100km - 120 giờ', price: '180.000đ' },
        { name: 'Hà Nội', distance: '800km - 900 giờ', price: '500.000đ' },
      ],
    },
  ];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActivePromo((current) => (current + 1) % promoSlides.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [promoSlides.length]);

  useEffect(() => {
    if (!diemDi.trim()) {
      setGoiYDiemDi([]);
      return;
    }
    const timeoutId = window.setTimeout(async () => {
      try {
        const { data } = await axios.get<{ data?: string[] }>('/api/catalog/origins', {
          params: { keyword: diemDi },
        });
        setGoiYDiemDi(data?.data ?? []);
      } catch {
        setGoiYDiemDi([]);
      }
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [diemDi]);

  useEffect(() => {
    if (!diemDen.trim()) {
      setGoiYDiemDen([]);
      return;
    }
    const timeoutId = window.setTimeout(async () => {
      try {
        const { data } = await axios.get<{ data?: string[] }>('/api/catalog/destinations', {
          params: { keyword: diemDen },
        });
        setGoiYDiemDen(data?.data ?? []);
      } catch {
        setGoiYDiemDen([]);
      }
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [diemDen]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

  const formatDateVn = (value?: string) => {
    if (!value) return '';
    const [y, m, d] = value.split('-');
    if (!y || !m || !d) return value;
    return `${d}/${m}/${y}`;
  };

  const formatWeekdayDate = (value?: string) => {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return formatDateVn(value);
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes || minutes <= 0) return '--:-- h';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} h`;
  };

  const toMinuteOfDay = (time?: string) => {
    if (!time) return null;
    const [h, m] = time.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };

  const addMinutesToTime = (time?: string, minutes?: number) => {
    const base = toMinuteOfDay(time);
    if (base == null || !minutes || minutes < 0) return '';
    const total = (base + minutes) % (24 * 60);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  };

  const getRouteDurationFallback = async (trip: TripSummary): Promise<number | undefined> => {
    const key = `${trip.diemDi}|${trip.diemDen}|${trip.tenTuyen}`;
    if (routeDurationCache[key]) {
      return routeDurationCache[key];
    }
    try {
      const { data } = await axios.get<{ data?: RouteSummary[] }>('/api/catalog/routes', {
        params: { diemDi: trip.diemDi, diemDen: trip.diemDen },
      });
      const routes = data?.data ?? [];
      const matched =
        routes.find((r) => r.tenTuyen === trip.tenTuyen && r.thoiGianDuKien != null) ??
        routes.find((r) => r.thoiGianDuKien != null);
      const duration = matched?.thoiGianDuKien;
      if (duration) {
        setRouteDurationCache((prev) => ({ ...prev, [key]: duration }));
      }
      return duration;
    } catch {
      return undefined;
    }
  };

  const onSearchTrips = async () => {
    if (!diemDi.trim() || !diemDen.trim()) {
      window.alert('Vui lòng nhập đầy đủ điểm đi và điểm đến.');
      return;
    }
    if (tripType === 'round-trip' && !ngayVe) {
      window.alert('Vui lòng chọn ngày về cho vé khứ hồi.');
      return;
    }
    setDangTimChuyen(true);
    setDaTimKiem(true);
    setThongBaoTimKiem('');
    setTripDangChonGhe(null);
    setSelectedTripInfo(null);
    setGheDangChonTheoChuyen({});
    setTieuChiDaTim({
      diemDi: diemDi.trim(),
      diemDen: diemDen.trim(),
      ngayDi,
      ngayVe,
      soVe,
      tripType,
    });
    try {
      const { data } = await axios.get<{ data?: TripSummary[] }>('/api/catalog/trips', {
        params: {
          diemDi: diemDi.trim(),
          diemDen: diemDen.trim(),
          ngayDi: ngayDi || undefined,
          soLuongVeToiThieu: Number(soVe),
        },
      });
      const trips = data?.data ?? [];
      setDanhSachChuyen(trips);
      if (!trips.length) {
        setThongBaoTimKiem('Hiện chưa có chuyến phù hợp. Vui lòng thử ngày hoặc tuyến khác.');
      }
    } catch {
      setDanhSachChuyen([]);
      setThongBaoTimKiem('Không thể tìm chuyến lúc này. Vui lòng thử lại sau.');
    } finally {
      setDangTimChuyen(false);
    }
  };

  const toggleChonGhe = async (tripId: number) => {
    if (tripDangChonGhe === tripId) {
      setTripDangChonGhe(null);
      return;
    }
    setGheDangChonTheoChuyen({});
    setTripDangChonGhe(tripId);
    const trip = danhSachChuyen.find((t) => t.id === tripId);
    if (trip) {
      const durationFromRoute = trip.thoiGianDuKienPhut ?? (await getRouteDurationFallback(trip));
      const gioDenTinhToan = trip.gioDenDuKien || addMinutesToTime(trip.gioDi, durationFromRoute);
      setSelectedTripInfo({
        id: trip.id,
        tenTuyen: trip.tenTuyen,
        diemDi: trip.diemDi,
        diemDen: trip.diemDen,
        ngayDi: trip.ngayDi,
        gioDi: trip.gioDi,
        gioDenDuKien: gioDenTinhToan,
        thoiGianDuKienPhut: durationFromRoute,
        khoangCach: trip.khoangCach,
      });
    }
    window.requestAnimationFrame(() => {
      const card = document.getElementById(`trip-card-${tripId}`);
      card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    if (soDoGheTheoChuyen[tripId]) return;
    setDangTaiSoDoGhe(true);
    try {
      const { data } = await axios.get<{ data?: SeatMapResponse }>(`/api/catalog/trips/${tripId}/seats`);
      const seatMap = data?.data;
      if (!seatMap) return;
      setSoDoGheTheoChuyen((prev) => ({ ...prev, [tripId]: seatMap }));
      setGheDangChonTheoChuyen((prev) => ({ ...prev, [tripId]: prev[tripId] ?? [] }));
    } catch {
      window.alert('Không thể tải sơ đồ ghế của chuyến này.');
    } finally {
      setDangTaiSoDoGhe(false);
    }
  };

  const onSelectSeat = (tripId: number, seat: SeatStatus) => {
    if (seat.daBan) return;
    setGheDangChonTheoChuyen((prev) => {
      const current = prev[tripId] ?? [];
      if (current.includes(seat.maGhe)) {
        return { ...prev, [tripId]: current.filter((s) => s !== seat.maGhe) };
      }
      if (current.length >= 5) {
        window.alert('Bạn chỉ có thể chọn tối đa 5 ghế.');
        return prev;
      }
      return { ...prev, [tripId]: [...current, seat.maGhe] };
    });
  };

  const norm = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const buildSleeperLayout = (apiSeats: SeatStatus[]): SeatLayout => {
    const total = apiSeats.length;
    const lowerCount = Math.ceil(total / 2);
    const upperCount = total - lowerCount;
    const toSeat = (idx: number, label: string): UiSeat => ({
      maGhe: label,
      daBan: apiSeats[idx]?.daBan ?? false,
    });
    const buildRows = (count: number, prefix: 'A' | 'B', startIdx: number) => {
      const rows: UiSeat[][] = [];
      if (count > 0) {
        rows.push(Array.from({ length: Math.min(2, count) }, (_, i) => toSeat(startIdx + i, `${prefix}${String(i + 1).padStart(2, '0')}`)));
      }
      let used = rows[0]?.length ?? 0;
      while (used < count) {
        const rowSize = Math.min(3, count - used);
        rows.push(
          Array.from({ length: rowSize }, (_, i) =>
            toSeat(startIdx + used + i, `${prefix}${String(used + i + 1).padStart(2, '0')}`)
          )
        );
        used += rowSize;
      }
      return rows;
    };
    return { tangDuoi: buildRows(lowerCount, 'A', 0), tangTren: buildRows(upperCount, 'B', lowerCount) };
  };

  const buildLimousineLayout = (apiSeats: SeatStatus[]): SeatLayout => {
    const total = apiSeats.length;
    const toSeat = (idx: number): UiSeat => ({
      maGhe: String(idx + 1).padStart(2, '0'),
      daBan: apiSeats[idx]?.daBan ?? false,
    });
    const rows: UiSeat[][] = [];
    if (total >= 3 && total % 2 === 1) {
      const pairUntil = total - 3;
      for (let idx = 0; idx < pairUntil; idx += 2) rows.push([toSeat(idx), toSeat(idx + 1)]);
      rows.push([toSeat(total - 3), toSeat(total - 2), toSeat(total - 1)]);
    } else {
      for (let idx = 0; idx < total; idx += 2) {
        const row: UiSeat[] = [toSeat(idx)];
        if (idx + 1 < total) row.push(toSeat(idx + 1));
        rows.push(row);
      }
    }
    return { single: rows, singleType: 'limousine' };
  };

  const buildSeatBusLayout = (apiSeats: SeatStatus[]): SeatLayout => {
    const total = apiSeats.length;
    const rows: UiSeat[][] = [];
    const rowCount = Math.ceil(total / 4);
    for (let row = 0; row < rowCount; row++) {
      const base = row * 4;
      const order = [3, 2, 1, 0];
      const rowSeats = order
        .map((offset) => {
          const idx = base + offset;
          if (idx >= total) return null;
          return { maGhe: String(idx + 1).padStart(2, '0'), daBan: apiSeats[idx]?.daBan ?? false };
        })
        .filter((s): s is UiSeat => Boolean(s));
      rows.push(rowSeats);
    }
    return { single: rows, singleType: 'seat' };
  };

  const getSeatLayoutByVehicleType = (vehicleType: string, apiSeats: SeatStatus[]): SeatLayout => {
    const vt = norm(vehicleType || '');
    if (vt.includes('giuong')) return buildSleeperLayout(apiSeats);
    if (vt.includes('limousine') || vt.includes('limosine')) return buildLimousineLayout(apiSeats);
    return buildSeatBusLayout(apiSeats);
  };

  const toggleTimeFilter = (key: TimeFilterKey) => {
    setTimeFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleVehicleFilter = (key: VehicleFilterKey) => {
    setVehicleFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const clearAllFilters = () => {
    setTimeFilters({ early: false, morning: false, afternoon: false, evening: false });
    setVehicleFilters({ ghe: false, giuong: false, limousine: false });
    setSeatRowFilters({ front: false, middle: false, back: false });
    setDeckFilters({ top: false, bottom: false });
  };

  const matchesTimeFilter = (trip: TripSummary) => {
    const selected = Object.entries(timeFilters).filter(([, v]) => v).map(([k]) => k as TimeFilterKey);
    if (!selected.length) return true;
    const hour = Number((trip.gioDi || '00:00:00').split(':')[0] ?? 0);
    return selected.some((k) => {
      if (k === 'early') return hour >= 0 && hour < 6;
      if (k === 'morning') return hour >= 6 && hour < 12;
      if (k === 'afternoon') return hour >= 12 && hour < 18;
      return hour >= 18 && hour < 24;
    });
  };

  const matchesVehicleFilter = (trip: TripSummary) => {
    const selected = Object.entries(vehicleFilters).filter(([, v]) => v).map(([k]) => k as VehicleFilterKey);
    if (!selected.length) return true;
    const kind = norm(trip.loaiXe || '');
    return selected.some((k) => {
      if (k === 'ghe') return kind.includes('ghe');
      if (k === 'giuong') return kind.includes('giuong');
      return kind.includes('limousine') || kind.includes('limosine');
    });
  };

  const matchesDeckFilter = (trip: TripSummary) => {
    if (!deckFilters.top && !deckFilters.bottom) return true;
    const kind = norm(trip.loaiXe || '');
    return kind.includes('giuong');
  };

  const filteredTrips = danhSachChuyen.filter((trip) => {
    return matchesTimeFilter(trip) && matchesVehicleFilter(trip) && matchesDeckFilter(trip);
  });

  return (
    <div className="bg-white">
      <div className="w-full py-4 flex justify-center">
        <img src={bannerImage} alt="Banner" className="object-cover rounded-xl shadow-md w-full max-w-6xl max-h-[400px]" />
      </div>

      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 max-w-5xl mx-auto">
          <div className="flex space-x-6 mb-4 border-b border-gray-200 pb-2">
            <label className="flex items-center space-x-2 cursor-pointer text-[#ef5222] font-medium">
              <input type="radio" name="tripType" checked={tripType === 'one-way'} onChange={() => setTripType('one-way')} className="form-radio text-[#ef5222]" />
              <span>Một chiều</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer text-gray-500">
              <input type="radio" name="tripType" checked={tripType === 'round-trip'} onChange={() => setTripType('round-trip')} className="form-radio" />
              <span>Khứ hồi</span>
            </label>
            <div className="ml-auto text-sm text-[#ef5222] hover:underline cursor-pointer">Hướng dẫn mua vé</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Điểm đi</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  autoComplete="off"
                  list={diemDi.trim() ? 'home-goi-y-diem-di' : undefined}
                  placeholder="Thành phố Hồ Chí Minh"
                  value={diemDi}
                  onChange={(e) => setDiemDi(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:border-[#ef5222]"
                />
                <datalist id="home-goi-y-diem-di">
                  {goiYDiemDi.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Điểm đến</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  autoComplete="off"
                  list={diemDen.trim() ? 'home-goi-y-diem-den' : undefined}
                  placeholder="Đồng Tháp"
                  value={diemDen}
                  onChange={(e) => setDiemDen(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:border-[#ef5222]"
                />
                <datalist id="home-goi-y-diem-den">
                  {goiYDiemDen.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày đi</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  lang="vi-VN"
                  value={ngayDi}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNgayDi(value);
                    if (ngayVe && value && ngayVe < value) setNgayVe(value);
                  }}
                  className="w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:border-[#ef5222]"
                />
              </div>
            </div>
            {tripType === 'round-trip' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày về</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    lang="vi-VN"
                    value={ngayVe}
                    min={ngayDi || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNgayVe(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:border-[#ef5222]"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Số vé</label>
              <div className="relative">
                <Users className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <select value={soVe} onChange={(e) => setSoVe(e.target.value)} className="w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:border-[#ef5222] appearance-none bg-white">
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                  <option>5</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <button type="button" onClick={onSearchTrips} disabled={dangTimChuyen} className="bg-[#ef5222] hover:bg-[#d84a1e] text-white px-12 py-3 rounded-full font-bold shadow-lg transition transform hover:scale-105 flex items-center disabled:opacity-70">
              {dangTimChuyen ? 'Đang tìm...' : 'Tìm chuyến xe'}
            </button>
          </div>
        </div>
      </div>

      {daTimKiem && (
        <div className="container mx-auto px-4 py-10 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 space-y-4">
              {selectedTripInfo && (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h4 className="text-sm font-bold text-gray-800 uppercase">Chuyến đi của bạn</h4>
                  </div>
                  <div className="px-4 py-3">
                    <div className="border-l-4 border-[#ef5222] pl-3">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-md bg-[#ef5222] text-white text-sm font-bold flex items-center justify-center mt-0.5">
                          1
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {formatWeekdayDate(selectedTripInfo.ngayDi)}
                          </p>
                          <p className="text-sm font-semibold text-gray-800">
                            {selectedTripInfo.diemDi} - {selectedTripInfo.diemDen}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-2xl font-semibold text-gray-900">{selectedTripInfo.gioDi?.slice(0, 5) || '--:--'}</p>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-gray-500">
                            {formatDuration(selectedTripInfo.thoiGianDuKienPhut)}
                            {selectedTripInfo.khoangCach ? ` - ${selectedTripInfo.khoangCach}Km` : ''}
                          </p>
                        </div>
                        <p className="text-2xl font-semibold text-gray-900">
                          {(selectedTripInfo.gioDenDuKien || addMinutesToTime(selectedTripInfo.gioDi, selectedTripInfo.thoiGianDuKienPhut))?.slice(0, 5) || '--:--'}
                        </p>
                      </div>
                      {(gheDangChonTheoChuyen[selectedTripInfo.id] ?? []).length > 0 && (
                        <p className="mt-2 text-sm text-gray-600">
                          Ghế:{' '}
                          <span className="font-semibold">{(gheDangChonTheoChuyen[selectedTripInfo.id] ?? []).join(', ')}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-800 uppercase">Bộ lọc tìm kiếm</h4>
                  <button type="button" onClick={clearAllFilters} className="text-[#ef5222] text-sm font-semibold hover:underline">
                    Bỏ lọc
                  </button>
                </div>
                <div className="px-4 py-4 space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Giờ đi</p>
                    <div className="space-y-2 text-gray-500">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={timeFilters.early} onChange={() => toggleTimeFilter('early')} />
                        Sáng sớm 00:00 - 06:00
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={timeFilters.morning} onChange={() => toggleTimeFilter('morning')} />
                        Buổi sáng 06:00 - 12:00
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={timeFilters.afternoon} onChange={() => toggleTimeFilter('afternoon')} />
                        Buổi chiều 12:00 - 18:00
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={timeFilters.evening} onChange={() => toggleTimeFilter('evening')} />
                        Buổi tối 18:00 - 24:00
                      </label>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Loại xe</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => toggleVehicleFilter('ghe')} className={`px-3 py-1.5 rounded-md border ${vehicleFilters.ghe ? 'border-[#ef5222] text-[#ef5222]' : 'border-gray-300 text-gray-700'}`}>Ghế</button>
                      <button type="button" onClick={() => toggleVehicleFilter('giuong')} className={`px-3 py-1.5 rounded-md border ${vehicleFilters.giuong ? 'border-[#ef5222] text-[#ef5222]' : 'border-gray-300 text-gray-700'}`}>Giường</button>
                      <button type="button" onClick={() => toggleVehicleFilter('limousine')} className={`px-3 py-1.5 rounded-md border ${vehicleFilters.limousine ? 'border-[#ef5222] text-[#ef5222]' : 'border-gray-300 text-gray-700'}`}>Limousine</button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Hàng ghế</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setSeatRowFilters((p) => ({ ...p, front: !p.front }))} className={`px-3 py-1.5 rounded-md border ${seatRowFilters.front ? 'border-[#ef5222] text-[#ef5222]' : 'border-gray-300 text-gray-700'}`}>Hàng đầu</button>
                      <button type="button" onClick={() => setSeatRowFilters((p) => ({ ...p, middle: !p.middle }))} className={`px-3 py-1.5 rounded-md border ${seatRowFilters.middle ? 'border-[#ef5222] text-[#ef5222]' : 'border-gray-300 text-gray-700'}`}>Hàng giữa</button>
                      <button type="button" onClick={() => setSeatRowFilters((p) => ({ ...p, back: !p.back }))} className={`px-3 py-1.5 rounded-md border ${seatRowFilters.back ? 'border-[#ef5222] text-[#ef5222]' : 'border-gray-300 text-gray-700'}`}>Hàng cuối</button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Tầng</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setDeckFilters((p) => ({ ...p, top: !p.top }))} className={`px-3 py-1.5 rounded-md border ${deckFilters.top ? 'border-[#ef5222] text-[#ef5222]' : 'border-gray-300 text-gray-700'}`}>Tầng trên</button>
                      <button type="button" onClick={() => setDeckFilters((p) => ({ ...p, bottom: !p.bottom }))} className={`px-3 py-1.5 rounded-md border ${deckFilters.bottom ? 'border-[#ef5222] text-[#ef5222]' : 'border-gray-300 text-gray-700'}`}>Tầng dưới</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <h3 className="text-2xl font-bold text-gray-800">
                  {tieuChiDaTim?.diemDi || 'Điểm đi'} - {tieuChiDaTim?.diemDen || 'Điểm đến'} ({filteredTrips.length})
                </h3>
                {thongBaoTimKiem && <p className="text-sm text-gray-500 mt-4">{thongBaoTimKiem}</p>}
                <div className="space-y-4 mt-4">
                  {filteredTrips.map((trip) => (
                    <div id={`trip-card-${trip.id}`} key={trip.id} className="rounded-xl border border-[#ef5222]/40 p-3 hover:shadow-md transition bg-white">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-[72px]">
                              <p className="text-3xl font-bold text-gray-900 leading-none">{trip.gioDi?.slice(0, 5) || '--:--'}</p>
                              <p className="text-[20px] leading-none text-green-700 mt-0.5">•</p>
                              <p className="text-lg font-bold text-gray-900 mt-0.5 leading-tight truncate">{trip.diemDi || '---'}</p>
                            </div>

                            <div className="flex-1 px-1 pt-0.5">
                              <div className="border-t border-dotted border-gray-300 mt-2" />
                              <p className="text-sm font-semibold text-gray-700 mt-1.5 text-center">
                                {formatDuration(trip.thoiGianDuKienPhut)}
                                {trip.khoangCach ? ` - ${trip.khoangCach}Km` : ''}
                              </p>
                              <p className="text-xs text-gray-500 text-center">(Asia/Ho Chi Minh)</p>
                            </div>

                            <div className="min-w-[72px] text-right">
                              <p className="text-3xl font-bold text-gray-900 leading-none">
                                {(trip.gioDenDuKien || addMinutesToTime(trip.gioDi, trip.thoiGianDuKienPhut))?.slice(0, 5) || '--:--'}
                              </p>
                              <p className="text-[20px] leading-none text-[#ef5222] mt-0.5">•</p>
                              <p className="text-lg font-bold text-gray-900 mt-0.5 leading-tight truncate">{trip.diemDen || '---'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="min-w-[145px] text-right pt-0.5">
                          <p className="text-xs text-gray-500">
                            {trip.loaiXe ? `${trip.loaiXe} • ` : ''}{trip.soGheTrong} chỗ trống
                          </p>
                          <p className="text-2xl font-bold text-[#ef5222] mt-1">{formatCurrency(Number(trip.giaVe || 0))}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-sm flex items-center gap-6">
                          <button type="button" onClick={() => toggleChonGhe(trip.id)} className={`pb-1 border-b-2 transition ${tripDangChonGhe === trip.id ? 'text-[#ef5222] border-[#ef5222] font-semibold' : 'text-gray-700 border-transparent hover:text-[#ef5222]'}`}>
                            Chọn ghế
                          </button>
                          <span className="text-gray-700">Lịch trình</span>
                          <span className="text-gray-700">Trung chuyển</span>
                          <span className="text-gray-700">Chính sách</span>
                        </div>
                        <button type="button" className="px-4 py-2 rounded-full text-sm font-semibold bg-[#ef5222] text-white hover:bg-[#d84a1e] transition">
                          Chọn chuyến
                        </button>
                      </div>

                      {tripDangChonGhe === trip.id && (
                        <div className="mt-4 border-t border-gray-100 pt-4">
                          {dangTaiSoDoGhe && !soDoGheTheoChuyen[trip.id] && <p className="text-sm text-gray-500">Đang tải sơ đồ ghế...</p>}
                          {soDoGheTheoChuyen[trip.id] && (
                            <>
                              <div className="flex items-center justify-center gap-10 text-base text-gray-700 mb-5 font-medium">
                                <span className="inline-flex items-center gap-1"><span className="w-5 h-5 rounded-md bg-gray-300 border border-gray-300" />Đã bán</span>
                                <span className="inline-flex items-center gap-1"><span className="w-5 h-5 rounded-md bg-blue-50 border border-blue-300" />Còn trống</span>
                                <span className="inline-flex items-center gap-1"><span className="w-5 h-5 rounded-md bg-[#fff3ef] border border-[#ef5222]" />Đang chọn</span>
                              </div>
                              {(() => {
                                const layout = getSeatLayoutByVehicleType(trip.loaiXe || '', soDoGheTheoChuyen[trip.id].ghe);
                                const renderSeatButton = (seat: SeatStatus, sizeClass = 'w-11 h-11 md:w-12 md:h-12') => {
                                  const selected = (gheDangChonTheoChuyen[trip.id] ?? []).includes(seat.maGhe);
                                  const seatClass = seat.daBan
                                    ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                                    : selected
                                      ? 'bg-[#fff3ef] text-[#ef5222] border-[#ef5222] cursor-pointer shadow-[0_2px_6px_rgba(239,82,34,0.2)]'
                                      : 'bg-blue-50 text-blue-500 border-blue-300 cursor-pointer hover:bg-blue-100';
                                  return (
                                    <button key={seat.maGhe} type="button" onClick={() => onSelectSeat(trip.id, seat)} disabled={seat.daBan} className={`${sizeClass} text-[13px] font-bold rounded-lg border-2 leading-none transition ${seatClass}`}>
                                      {seat.maGhe}
                                    </button>
                                  );
                                };
                                return (
                                  <>
                                    {layout.tangDuoi && (
                                      <div className="mb-4">
                                        <p className="text-sm font-semibold text-gray-700 mb-2 text-center">Tầng dưới</p>
                                        <div className="space-y-3 max-w-md mx-auto">
                                          {layout.tangDuoi.map((row, rowIdx) => (
                                            <div key={`duoi-${rowIdx}`} className="grid grid-cols-3 gap-3 w-fit mx-auto">
                                              {row.length === 2 ? (
                                                <>
                                                  {renderSeatButton(row[0] as SeatStatus)}
                                                  <div className="w-11 h-11 md:w-12 md:h-12" />
                                                  {renderSeatButton(row[1] as SeatStatus)}
                                                </>
                                              ) : (
                                                row.map((seat) => renderSeatButton(seat as SeatStatus))
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {layout.tangTren && (
                                      <div className="mb-4">
                                        <p className="text-sm font-semibold text-gray-700 mb-2 text-center">Tầng trên</p>
                                        <div className="space-y-3 max-w-md mx-auto">
                                          {layout.tangTren.map((row, rowIdx) => (
                                            <div key={`tren-${rowIdx}`} className="grid grid-cols-3 gap-3 w-fit mx-auto">
                                              {row.length === 2 ? (
                                                <>
                                                  {renderSeatButton(row[0] as SeatStatus)}
                                                  <div className="w-11 h-11 md:w-12 md:h-12" />
                                                  {renderSeatButton(row[1] as SeatStatus)}
                                                </>
                                              ) : (
                                                row.map((seat) => renderSeatButton(seat as SeatStatus))
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {layout.single && (
                                      <div className="mb-4">
                                        <p className="text-sm font-semibold text-gray-700 mb-2 text-center">Tầng dưới</p>
                                        {layout.singleType === 'seat' ? (
                                          <div className="space-y-3 max-w-md mx-auto">
                                            {layout.single.map((row, rowIdx) => (
                                              <div key={`single-seat-${rowIdx}`} className="flex items-center justify-center gap-10">
                                                <div className="flex gap-3">{row.slice(0, 2).map((seat) => renderSeatButton(seat as SeatStatus))}</div>
                                                <div className="flex gap-3">{row.slice(2).map((seat) => renderSeatButton(seat as SeatStatus))}</div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="space-y-2 max-w-[220px] mx-auto">
                                            {layout.single.map((row, rowIdx) => (
                                              <div key={`single-limo-${rowIdx}`} className="grid grid-cols-3 gap-2 w-fit mx-auto">
                                                {row.length === 3 ? (
                                                  row.map((seat) => renderSeatButton(seat as SeatStatus, 'w-10 h-10'))
                                                ) : (
                                                  <>
                                                    {renderSeatButton(row[0] as SeatStatus, 'w-10 h-10')}
                                                    <div className="w-10 h-10" />
                                                    {row[1] ? renderSeatButton(row[1] as SeatStatus, 'w-10 h-10') : <div className="w-10 h-10" />}
                                                  </>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                              {(gheDangChonTheoChuyen[trip.id] ?? []).length > 0 && (
                                <div className="mt-4 flex items-center justify-between flex-wrap gap-2 border-t border-gray-100 pt-3">
                                  <div>
                                    <p className="text-sm text-gray-700">
                                      {(gheDangChonTheoChuyen[trip.id] ?? []).length} Vé
                                    </p>
                                    <p className="text-sm font-semibold text-gray-700">{(gheDangChonTheoChuyen[trip.id] ?? []).join(', ')}</p>
                                  </div>
                                  <div className="flex items-end gap-0.75">
                                    <div className="text-right">
                                      <p className="text-sm text-gray-500">Tổng tiền</p>
                                      <p className="text-lg font-bold text-[#ef5222]">{formatCurrency((gheDangChonTheoChuyen[trip.id] ?? []).length * Number(trip.giaVe || 0))}</p>
                                    </div>
                                    <button type="button" className="px-6 py-2 rounded-full text-sm font-semibold bg-[#ef5222] text-white hover:bg-[#d84a1e] transition">Chọn</button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {!filteredTrips.length && daTimKiem && !thongBaoTimKiem && (
                    <div className="rounded-xl border border-gray-200 p-6 text-center text-gray-500">
                      Không có chuyến phù hợp với bộ lọc hiện tại.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-[#00613d] mb-8 uppercase">KHUYẾN MÃI NỔI BẬT</h2>
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-2xl">
            <div className="flex w-[200%] transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${activePromo * 50}%)` }}>
              {promoSlides.map((group) => (
                <div key={group[0].title} className="w-1/2 shrink-0 px-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {group.map((slide) => (
                      <div key={slide.title} className="rounded-xl overflow-hidden shadow-lg border border-gray-100">
                        <div className="relative h-40 md:h-48 bg-white">
                          <img src={slide.image} alt={slide.title} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-black/15" />
                          <div className="absolute left-0 right-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3 text-white font-semibold text-sm md:text-base">{slide.title}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-center gap-2">
            {promoSlides.map((slide, index) => (
              <button key={slide[0].title} type="button" onClick={() => setActivePromo(index)} className={`h-3 rounded-full transition-all duration-300 ${index === activePromo ? 'w-10 bg-[#ef5222]' : 'w-3 bg-gray-300 hover:bg-gray-400'}`} aria-label={`Chuyển tới khuyến mãi ${index + 1}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-[#00613d] mb-2 uppercase">TUYẾN PHỔ BIẾN</h2>
          <p className="text-center text-gray-500 mb-8">Được khách hàng tin tưởng và lựa chọn</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {routeCards.map((card) => (
              <div key={card.title} className="bg-white rounded-xl shadow overflow-hidden">
                <div className="h-32 bg-gray-300 relative group overflow-hidden cursor-pointer">
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition z-10">
                    <span className="text-white font-bold text-lg drop-shadow-md">{card.title}</span>
                  </div>
                  <img src={card.image} alt={card.imageAlt} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                </div>
                <div className="p-4">
                  {card.destinations.map((destination) => (
                    <div key={`${card.title}-${destination.name}`} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <h4 className="font-semibold text-gray-800">{destination.name}</h4>
                        <p className="text-xs text-gray-500">{destination.distance}</p>
                      </div>
                      <span className="font-bold text-[#ef5222]">{destination.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;