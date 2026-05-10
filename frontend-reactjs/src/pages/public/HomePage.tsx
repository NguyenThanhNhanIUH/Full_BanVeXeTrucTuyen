import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { api } from '../../api/client';
import type { PublicBranding } from '../../types/publicBranding';
import {
  getVehicleKind,
  gheHienThiTrenBang,
  tripHasAvailableSeatMatchingFilters,
  type SeatMapResponse,
  type SeatStatus,
} from '../../utils/seatMapLayout';
import { HomePromoSection, HomeRouteCardsSection } from './home/HomeMarketingSections';
import HomeSearchHero from './home/HomeSearchHero';
import HomeTripCard from './home/HomeTripCard';
import { addMinutesToTime, formatDuration, formatWeekdayDate } from './home/homeFormatters';
import type {
  HomeRestoreState,
  ResultTab,
  RouteSummary,
  SearchCriteria,
  SelectedTripInfo,
  TimeFilterKey,
  TripSummary,
  VehicleFilterKey,
} from './home/homeTypes';

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const branding = useOutletContext<PublicBranding | undefined>();
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
  const [danhSachChuyenVe, setDanhSachChuyenVe] = useState<TripSummary[]>([]);
  const [activeResultTab, setActiveResultTab] = useState<ResultTab>('outbound');
  const [chuyenDiDaChon, setChuyenDiDaChon] = useState<TripSummary | null>(null);
  const [chuyenVeDaChon, setChuyenVeDaChon] = useState<TripSummary | null>(null);
  const [chuyenChonDauTien, setChuyenChonDauTien] = useState<TripSummary | null>(null);
  const [tripIdsDaMoChonGhe, setTripIdsDaMoChonGhe] = useState<number[]>([]);
  const [tripDangNoiBatId, setTripDangNoiBatId] = useState<number | null>(null);
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

  useEffect(() => {
    if (!diemDi.trim()) {
      setGoiYDiemDi([]);
      return;
    }
    const timeoutId = window.setTimeout(async () => {
      try {
        const { data } = await api.get<{ data?: string[] }>('/api/catalog/origins', {
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
        const { data } = await api.get<{ data?: string[] }>('/api/catalog/destinations', {
          params: { keyword: diemDen },
        });
        setGoiYDiemDen(data?.data ?? []);
      } catch {
        setGoiYDiemDen([]);
      }
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [diemDen]);

  const getRouteDurationFallback = async (trip: TripSummary): Promise<number | undefined> => {
    const key = `${trip.diemDi}|${trip.diemDen}|${trip.tenTuyen}`;
    if (routeDurationCache[key]) {
      return routeDurationCache[key];
    }
    try {
      const { data } = await api.get<{ data?: RouteSummary[] }>('/api/catalog/routes', {
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
    setActiveResultTab('outbound');
    setChuyenDiDaChon(null);
    setChuyenVeDaChon(null);
    setChuyenChonDauTien(null);
    setTripIdsDaMoChonGhe([]);
    setTripDangNoiBatId(null);
    setTieuChiDaTim({
      diemDi: diemDi.trim(),
      diemDen: diemDen.trim(),
      ngayDi,
      ngayVe,
      soVe,
      tripType,
    });
    try {
      const [outboundRes, returnRes] = await Promise.all([
        api.get<{ data?: TripSummary[] }>('/api/catalog/trips', {
          params: {
            diemDi: diemDi.trim(),
            diemDen: diemDen.trim(),
            ngayDi: ngayDi || undefined,
            soLuongVeToiThieu: Number(soVe),
          },
        }),
        tripType === 'round-trip'
          ? api.get<{ data?: TripSummary[] }>('/api/catalog/trips', {
              params: {
                diemDi: diemDen.trim(),
                diemDen: diemDi.trim(),
                ngayDi: ngayVe || undefined,
                soLuongVeToiThieu: Number(soVe),
              },
            })
          : Promise.resolve({ data: { data: [] } }),
      ]);
      const trips = outboundRes.data?.data ?? [];
      const returnTrips = returnRes.data?.data ?? [];
      setDanhSachChuyen(trips);
      setDanhSachChuyenVe(returnTrips);
      if (!trips.length && (tripType !== 'round-trip' || !returnTrips.length)) {
        setThongBaoTimKiem('Hiện chưa có chuyến phù hợp. Vui lòng thử ngày hoặc tuyến khác.');
      }
    } catch {
      setDanhSachChuyen([]);
      setDanhSachChuyenVe([]);
      setThongBaoTimKiem('Không thể tìm chuyến lúc này. Vui lòng thử lại sau.');
    } finally {
      setDangTimChuyen(false);
    }
  };

  const onSwapPlaces = () => {
    const nextDiemDi = diemDen;
    const nextDiemDen = diemDi;
    setDiemDi(nextDiemDi);
    setDiemDen(nextDiemDen);
    setGoiYDiemDi([]);
    setGoiYDiemDen([]);
  };

  const toggleChonGhe = async (tripId: number) => {
    if (tripDangChonGhe === tripId) {
      setTripDangChonGhe(null);
      return;
    }
    if (tripType === 'one-way') {
      setGheDangChonTheoChuyen({});
    }
    setTripDangChonGhe(tripId);
    setTripDangNoiBatId(tripId);
    setTripIdsDaMoChonGhe((prev) => (prev.includes(tripId) ? prev : [...prev, tripId]));
    const trip = [...danhSachChuyen, ...danhSachChuyenVe].find((t) => t.id === tripId);
    if (trip) {
      if (activeResultTab === 'outbound') {
        setChuyenDiDaChon(trip);
      } else {
        setChuyenVeDaChon(trip);
      }
      if (tripType === 'one-way') {
        setChuyenChonDauTien(trip);
      } else if (!chuyenChonDauTien) {
        setChuyenChonDauTien(trip);
      }
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
      const { data } = await api.get<{ data?: SeatMapResponse }>(`/api/catalog/trips/${tripId}/seats`);
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

  const ensureTripPanelOpen = (tripId: number) => {
    if (tripDangChonGhe !== tripId) {
      void toggleChonGhe(tripId);
    }
  };

  const onSelectSeat = (tripId: number, seat: SeatStatus) => {
    if (seat.daBan) return;
    setTripDangNoiBatId(tripId);
    setTripIdsDaMoChonGhe((prev) => (prev.includes(tripId) ? prev : [...prev, tripId]));
    const trip = [...danhSachChuyen, ...danhSachChuyenVe].find((t) => t.id === tripId);
    if (trip) {
      if (activeResultTab === 'outbound') setChuyenDiDaChon(trip);
      if (activeResultTab === 'return') setChuyenVeDaChon(trip);
      if (tripType === 'one-way') {
        setChuyenChonDauTien(trip);
      } else if (!chuyenChonDauTien) {
        setChuyenChonDauTien(trip);
      }
    }
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

  useEffect(() => {
    const state = location.state as
      | {
          homeRestoreState?: HomeRestoreState;
          reopenTrip?: {
            id: number;
            tenTuyen: string;
            diemDi: string;
            diemDen: string;
            ngayDi: string;
            gioDi: string;
            gioDenDuKien?: string;
            thoiGianDuKienPhut?: number;
            giaVe: number;
            loaiXe?: string;
          };
          selectedSeats?: string[];
        }
      | undefined;
    const restoredHome = state?.homeRestoreState;
    if (restoredHome) {
      setTripType(restoredHome.search.tripType);
      setDiemDi(restoredHome.search.diemDi);
      setDiemDen(restoredHome.search.diemDen);
      setNgayDi(restoredHome.search.ngayDi);
      setNgayVe(restoredHome.search.ngayVe);
      setSoVe(restoredHome.search.soVe);
      setDaTimKiem(true);
      setThongBaoTimKiem('');
      setTieuChiDaTim(restoredHome.search);
      setDanhSachChuyen(restoredHome.outboundTrips);
      setDanhSachChuyenVe(restoredHome.returnTrips);
      setActiveResultTab(restoredHome.activeResultTab);
      setChuyenDiDaChon(restoredHome.chuyenDiDaChon);
      setChuyenVeDaChon(restoredHome.chuyenVeDaChon);
      setChuyenChonDauTien(restoredHome.chuyenChonDauTien);
      setGheDangChonTheoChuyen(restoredHome.gheDangChonTheoChuyen);
      setTripIdsDaMoChonGhe(restoredHome.tripIdsDaMoChonGhe);
      setTripDangNoiBatId(restoredHome.tripDangNoiBatId);
      const focusTripId = restoredHome.focusTripId ?? restoredHome.tripDangNoiBatId;
      if (focusTripId) {
        setTripDangChonGhe(focusTripId);
        window.requestAnimationFrame(() => {
          const card = document.getElementById(`trip-card-${focusTripId}`);
          card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    const reopenTrip = state?.reopenTrip;
    if (!reopenTrip) return;

    const restoredTrip: TripSummary = {
      id: reopenTrip.id,
      tenTuyen: reopenTrip.tenTuyen,
      diemDi: reopenTrip.diemDi,
      diemDen: reopenTrip.diemDen,
      ngayDi: reopenTrip.ngayDi,
      gioDi: reopenTrip.gioDi,
      gioDenDuKien: reopenTrip.gioDenDuKien,
      thoiGianDuKienPhut: reopenTrip.thoiGianDuKienPhut,
      khoangCach: undefined,
      giaVe: reopenTrip.giaVe,
      loaiXe: reopenTrip.loaiXe || '',
      soGheTrong: 0,
    };

    setDaTimKiem(true);
    setThongBaoTimKiem('');
    setDanhSachChuyen((prev) => {
      const existed = prev.find((t) => t.id === restoredTrip.id);
      return existed
        ? prev.map((t) => (t.id === restoredTrip.id ? { ...t, ...restoredTrip } : t))
        : [restoredTrip, ...prev];
    });
    setTripDangChonGhe(restoredTrip.id);
    setSelectedTripInfo({
      id: restoredTrip.id,
      tenTuyen: restoredTrip.tenTuyen,
      diemDi: restoredTrip.diemDi,
      diemDen: restoredTrip.diemDen,
      ngayDi: restoredTrip.ngayDi,
      gioDi: restoredTrip.gioDi,
      gioDenDuKien: restoredTrip.gioDenDuKien,
      thoiGianDuKienPhut: restoredTrip.thoiGianDuKienPhut,
      khoangCach: restoredTrip.khoangCach,
    });
    setGheDangChonTheoChuyen((prev) => ({ ...prev, [restoredTrip.id]: state?.selectedSeats ?? [] }));

    if (!soDoGheTheoChuyen[restoredTrip.id]) {
      setDangTaiSoDoGhe(true);
      api
        .get<{ data?: SeatMapResponse }>(`/api/catalog/trips/${restoredTrip.id}/seats`)
        .then((res) => {
          const seatMap = res.data?.data;
          if (!seatMap) return;
          setSoDoGheTheoChuyen((prev) => ({ ...prev, [restoredTrip.id]: seatMap }));
        })
        .catch(() => {
          window.alert('Không thể tải lại sơ đồ ghế của chuyến đã chọn.');
        })
        .finally(() => setDangTaiSoDoGhe(false));
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, soDoGheTheoChuyen]);

  const mapTripForBooking = (trip: TripSummary) => ({
    id: trip.id,
    tenTuyen: trip.tenTuyen,
    diemDi: trip.diemDi,
    diemDen: trip.diemDen,
    ngayDi: trip.ngayDi,
    gioDi: trip.gioDi,
    gioDenDuKien: trip.gioDenDuKien || addMinutesToTime(trip.gioDi, trip.thoiGianDuKienPhut),
    thoiGianDuKienPhut: trip.thoiGianDuKienPhut,
    giaVe: Number(trip.giaVe || 0),
    loaiXe: trip.loaiXe,
  });

  const buildHomeRestoreState = (focusTripId?: number | null): HomeRestoreState => ({
    search: {
      diemDi,
      diemDen,
      ngayDi,
      ngayVe,
      soVe,
      tripType,
    },
    outboundTrips: danhSachChuyen,
    returnTrips: danhSachChuyenVe,
    activeResultTab,
    chuyenDiDaChon,
    chuyenVeDaChon,
    chuyenChonDauTien,
    gheDangChonTheoChuyen,
    tripIdsDaMoChonGhe,
    tripDangNoiBatId,
    focusTripId: focusTripId ?? tripDangNoiBatId ?? null,
  });

  const onChooseTrip = (trip: TripSummary) => {
    setTripDangNoiBatId(trip.id);
    if (tripType !== 'round-trip') {
      navigate('/dat-ve', {
        state: {
          tripType: 'one-way',
          trip: mapTripForBooking(trip),
          selectedSeats: gheDangChonTheoChuyen[trip.id] ?? [],
          homeRestoreState: buildHomeRestoreState(trip.id),
        },
      });
      return;
    }
    if (activeResultTab === 'outbound') setChuyenDiDaChon(trip);
    if (activeResultTab === 'return') setChuyenVeDaChon(trip);

    if (!chuyenChonDauTien) {
      setChuyenChonDauTien(trip);
      setActiveResultTab(activeResultTab === 'outbound' ? 'return' : 'outbound');
      setTripDangChonGhe(null);
      setSelectedTripInfo(null);
      return;
    }

    const outbound = activeResultTab === 'outbound' ? trip : chuyenDiDaChon;
    const ret = activeResultTab === 'return' ? trip : chuyenVeDaChon;
    if (!outbound || !ret) {
      setActiveResultTab(activeResultTab === 'outbound' ? 'return' : 'outbound');
      return;
    }
    navigate('/dat-ve', {
      state: {
        tripType: 'round-trip',
        outboundTrip: mapTripForBooking(outbound),
        returnTrip: mapTripForBooking(ret),
        selectedSeatsOutbound: gheDangChonTheoChuyen[outbound.id] ?? [],
        selectedSeatsReturn: gheDangChonTheoChuyen[ret.id] ?? [],
        homeRestoreState: buildHomeRestoreState(trip.id),
      },
    });
  };

  const onSwitchResultTab = (tab: ResultTab) => {
    setActiveResultTab(tab);
    if (tab === 'outbound' && chuyenDiDaChon) {
      setTripDangNoiBatId(chuyenDiDaChon.id);
      return;
    }
    if (tab === 'return' && chuyenVeDaChon) {
      setTripDangNoiBatId(chuyenVeDaChon.id);
    }
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

  const matchesTimeFilter = useCallback((trip: TripSummary) => {
    const selected = Object.entries(timeFilters).filter(([, v]) => v).map(([k]) => k as TimeFilterKey);
    if (!selected.length) return true;
    const hour = Number((trip.gioDi || '00:00:00').split(':')[0] ?? 0);
    return selected.some((k) => {
      if (k === 'early') return hour >= 0 && hour < 6;
      if (k === 'morning') return hour >= 6 && hour < 12;
      if (k === 'afternoon') return hour >= 12 && hour < 18;
      return hour >= 18 && hour < 24;
    });
  }, [timeFilters]);

  const matchesVehicleFilter = useCallback((trip: TripSummary) => {
    const selected = Object.entries(vehicleFilters).filter(([, v]) => v).map(([k]) => k as VehicleFilterKey);
    if (!selected.length) return true;
    const kind = normalizeText(trip.loaiXe || '');
    return selected.some((k) => {
      if (k === 'ghe') return kind.includes('ghe');
      if (k === 'giuong') return kind.includes('giuong');
      return kind.includes('limousine') || kind.includes('limosine');
    });
  }, [vehicleFilters]);

  const applyAllFilters = (trips: TripSummary[]) =>
    trips.filter((trip) => matchesTimeFilter(trip) && matchesVehicleFilter(trip));

  const baseFilteredOutbound = applyAllFilters(danhSachChuyen);
  const baseFilteredReturn = applyAllFilters(danhSachChuyenVe);
  const baseListForTab = activeResultTab === 'outbound' ? baseFilteredOutbound : baseFilteredReturn;
  const hasSeatZoneFilter =
    seatRowFilters.front || seatRowFilters.middle || seatRowFilters.back || deckFilters.top || deckFilters.bottom;
  const filteredTrips = hasSeatZoneFilter
    ? baseListForTab.filter((t) => tripHasAvailableSeatMatchingFilters(t.loaiXe, soDoGheTheoChuyen[t.id], seatRowFilters, deckFilters))
    : baseListForTab;
  const coChuyenGiuongTrongKetQua = baseListForTab.some((t) => getVehicleKind(t.loaiXe || '') === 'sleeper');

  useEffect(() => {
    if (!hasSeatZoneFilter) return;
    const list = activeResultTab === 'outbound' ? danhSachChuyen : danhSachChuyenVe;
    const base = list.filter((t) => matchesTimeFilter(t) && matchesVehicleFilter(t));
    const missing = base.filter((t) => !soDoGheTheoChuyen[t.id]);
    if (missing.length === 0) return;
    let cancelled = false;
    void (async () => {
      const results = await Promise.all(
        missing.map((t) =>
          api
            .get<{ data?: SeatMapResponse }>(`/api/catalog/trips/${t.id}/seats`)
            .then((r) => ({ id: t.id, map: r.data?.data as SeatMapResponse | undefined }))
            .catch(() => ({ id: t.id, map: undefined })),
        ),
      );
      if (cancelled) return;
      setSoDoGheTheoChuyen((prev) => {
        const next = { ...prev };
        for (const { id, map } of results) {
          if (map) next[id] = map;
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [hasSeatZoneFilter, activeResultTab, danhSachChuyen, danhSachChuyenVe, timeFilters, vehicleFilters, seatRowFilters, deckFilters, soDoGheTheoChuyen, matchesTimeFilter, matchesVehicleFilter]);

  return (
    <div className="bg-white">
      <HomeSearchHero
        bannerUrl={branding?.bannerUrl}
        tripType={tripType}
        onTripTypeChange={setTripType}
        diemDi={diemDi}
        onDiemDiChange={setDiemDi}
        goiYDiemDi={goiYDiemDi}
        onSwapPlaces={onSwapPlaces}
        diemDen={diemDen}
        onDiemDenChange={setDiemDen}
        goiYDiemDen={goiYDiemDen}
        ngayDi={ngayDi}
        onNgayDiChange={(v) => {
          setNgayDi(v);
          if (ngayVe && v && ngayVe < v) setNgayVe(v);
        }}
        ngayVe={ngayVe}
        onNgayVeChange={setNgayVe}
        soVe={soVe}
        onSoVeChange={setSoVe}
        onSearchTrips={onSearchTrips}
        dangTimChuyen={dangTimChuyen}
      />

      {daTimKiem && (
        <div className="container mx-auto px-4 py-10 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 space-y-4">
              {(chuyenChonDauTien || chuyenDiDaChon || chuyenVeDaChon || selectedTripInfo) && (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h4 className="text-sm font-bold text-gray-800 uppercase">Chuyến đi của bạn</h4>
                  </div>
                  <div className="px-4 py-3">
                    {(() => {
                      const hasBothDirectional = Boolean(chuyenDiDaChon && chuyenVeDaChon);
                      const hasSelectedSeatBoth =
                        hasBothDirectional &&
                        (gheDangChonTheoChuyen[chuyenDiDaChon!.id] ?? []).length > 0 &&
                        (gheDangChonTheoChuyen[chuyenVeDaChon!.id] ?? []).length > 0;
                      const hasOpenedSeatBoth =
                        hasBothDirectional &&
                        tripIdsDaMoChonGhe.includes(chuyenDiDaChon!.id) &&
                        tripIdsDaMoChonGhe.includes(chuyenVeDaChon!.id);
                      const showBoth = hasBothDirectional && (hasSelectedSeatBoth || hasOpenedSeatBoth);
                      const tripOne = showBoth ? chuyenDiDaChon : chuyenDiDaChon ?? chuyenChonDauTien;
                      const tripTwo = showBoth ? chuyenVeDaChon : null;
                      if (!tripOne && !selectedTripInfo) return null;
                      const renderTripBlock = (trip: TripSummary, order: 1 | 2, withTopBorder = false) => {
                        const highlightByTab =
                          (activeResultTab === 'outbound' && chuyenDiDaChon?.id === trip.id) ||
                          (activeResultTab === 'return' && chuyenVeDaChon?.id === trip.id);
                        const isHighlighted = highlightByTab || tripDangNoiBatId === trip.id;
                        const seats = gheDangChonTheoChuyen[trip.id] ?? [];
                        const badgeBase = 'bg-[#9ca3af]';
                        const badgeActiveFill = isHighlighted ? 'bg-[#ef5222]' : '';
                        const badgeHighlight = isHighlighted
                          ? 'ring-4 ring-[#ef5222]/25 scale-105 shadow-md'
                          : '';
                        return (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setTripDangNoiBatId(trip.id);
                              if (chuyenDiDaChon && trip.id === chuyenDiDaChon.id) setActiveResultTab('outbound');
                              if (chuyenVeDaChon && trip.id === chuyenVeDaChon.id) setActiveResultTab('return');
                            }}
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter' && e.key !== ' ') return;
                              e.preventDefault();
                              setTripDangNoiBatId(trip.id);
                              if (chuyenDiDaChon && trip.id === chuyenDiDaChon.id) setActiveResultTab('outbound');
                              if (chuyenVeDaChon && trip.id === chuyenVeDaChon.id) setActiveResultTab('return');
                            }}
                            className={`border-l-4 ${isHighlighted ? 'border-[#ef5222]' : 'border-transparent'} pl-3 ${withTopBorder ? 'pt-3 border-t border-gray-100' : 'pb-3'} ${isHighlighted ? 'bg-[#fff7f3] rounded-r-md' : ''}`}
                          >
                            <div className="flex gap-3">
                              <div
                                className={`w-8 h-8 rounded-md text-white text-sm font-bold flex items-center justify-center mt-0.5 transition ${badgeBase} ${badgeActiveFill} ${badgeHighlight}`}
                              >
                                {order}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{formatWeekdayDate(trip.ngayDi)}</p>
                                <p className="text-sm font-semibold text-gray-800">{trip.diemDi} - {trip.diemDen}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <p className="text-2xl font-semibold text-gray-900">{trip.gioDi?.slice(0, 5) || '--:--'}</p>
                              <div className="text-center">
                                <p className="text-sm font-semibold text-gray-500">
                                  {formatDuration(trip.thoiGianDuKienPhut)}
                                  {trip.khoangCach ? ` - ${trip.khoangCach}Km` : ''}
                                </p>
                              </div>
                              <p className="text-2xl font-semibold text-gray-900">
                                {(trip.gioDenDuKien || addMinutesToTime(trip.gioDi, trip.thoiGianDuKienPhut))?.slice(0, 5) || '--:--'}
                              </p>
                            </div>
                            <p className="mt-2 text-sm text-gray-600">
                              Ghế:{' '}
                              <span className="font-semibold">
                                {seats.length
                                  ? gheHienThiTrenBang(seats, soDoGheTheoChuyen[trip.id] ?? null, trip.loaiXe || '')
                                  : 'Chưa chọn ghế'}
                              </span>
                            </p>
                          </div>
                        );
                      };
                      return (
                        <>
                          {tripOne && (
                            renderTripBlock(tripOne, 1, false)
                          )}
                          {tripTwo && (
                            renderTripBlock(tripTwo, 2, true)
                          )}
                          {!tripOne && selectedTripInfo && (
                            <div className="border-l-4 border-[#ef5222] pl-3">
                              <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-md bg-[#ef5222] text-white text-sm font-bold flex items-center justify-center mt-0.5">1</div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">{formatWeekdayDate(selectedTripInfo.ngayDi)}</p>
                                  <p className="text-sm font-semibold text-gray-800">{selectedTripInfo.diemDi} - {selectedTripInfo.diemDen}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
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

                  {coChuyenGiuongTrongKetQua && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Tầng (xe giường)</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setDeckFilters((p) => ({ ...p, top: !p.top }))} className={`px-3 py-1.5 rounded-md border ${deckFilters.top ? 'border-[#ef5222] text-[#ef5222]' : 'border-gray-300 text-gray-700'}`}>Tầng trên (B)</button>
                        <button type="button" onClick={() => setDeckFilters((p) => ({ ...p, bottom: !p.bottom }))} className={`px-3 py-1.5 rounded-md border ${deckFilters.bottom ? 'border-[#ef5222] text-[#ef5222]' : 'border-gray-300 text-gray-700'}`}>Tầng dưới (A)</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div id="trip-results-root" className="lg:col-span-8">
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <h3 className="text-2xl font-bold text-gray-800">
                  {(activeResultTab === 'return' ? tieuChiDaTim?.diemDen : tieuChiDaTim?.diemDi) || 'Điểm đi'} - {(activeResultTab === 'return' ? tieuChiDaTim?.diemDi : tieuChiDaTim?.diemDen) || 'Điểm đến'} ({filteredTrips.length})
                </h3>
                {tieuChiDaTim?.tripType === 'round-trip' && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
                    <div className="grid grid-cols-2 text-sm font-semibold">
                      <button
                        type="button"
                        onClick={() => onSwitchResultTab('outbound')}
                        className={`px-4 py-3 text-center transition ${
                          activeResultTab === 'outbound'
                            ? 'border-b-2 border-[#ef5222] bg-[#fff6f3] text-[#ef5222]'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        CHUYẾN ĐI - {formatWeekdayDate(tieuChiDaTim.ngayDi || ngayDi)}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSwitchResultTab('return')}
                        className={`px-4 py-3 text-center transition ${
                          activeResultTab === 'return'
                            ? 'border-b-2 border-[#ef5222] bg-[#fff6f3] text-[#ef5222]'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        CHUYẾN VỀ - {formatWeekdayDate(tieuChiDaTim.ngayVe || ngayVe)}
                      </button>
                    </div>
                  </div>
                )}
                {tieuChiDaTim?.tripType === 'round-trip' && chuyenDiDaChon && (
                  <p className="mt-3 rounded-md bg-[#fff6f3] px-3 py-2 text-sm text-[#bf3f18]">
                    Đã chọn chuyến đi: <span className="font-semibold">{chuyenDiDaChon.gioDi?.slice(0, 5)} - {chuyenDiDaChon.tenTuyen}</span>. Hãy chọn chuyến về để tiếp tục đặt vé.
                  </p>
                )}
                {thongBaoTimKiem && <p className="text-sm text-gray-500 mt-4">{thongBaoTimKiem}</p>}
                <div className="space-y-4 mt-4">
                  {filteredTrips.map((trip) => (
                    <HomeTripCard
                      key={trip.id}
                      trip={trip}
                      tripDangChonGhe={tripDangChonGhe}
                      dangTaiSoDoGhe={dangTaiSoDoGhe}
                      soDoGheTheoChuyen={soDoGheTheoChuyen}
                      gheDangChonTheoChuyen={gheDangChonTheoChuyen}
                      onToggleSeatPanel={toggleChonGhe}
                      onEnsureTripPanelOpen={ensureTripPanelOpen}
                      onSelectSeat={onSelectSeat}
                      onChooseTrip={onChooseTrip}
                      tripType={tripType}
                      activeResultTab={activeResultTab}
                    />
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

      <HomePromoSection />
      <HomeRouteCardsSection />
    </div>
  );
};

export default HomePage;