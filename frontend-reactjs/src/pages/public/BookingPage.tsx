import { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../api/client';
import { getStoredEmail, getStoredName, getStoredPhone, getStoredRole } from '../../auth/storage';

type TripPayload = {
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

type SeatStatus = {
  maGhe: string;
  daBan: boolean;
};

type SeatMapResponse = {
  tongSoGhe: number;
  ghe: SeatStatus[];
};

type UiSeat = {
  /** Mã ghế gửi API — trùng GET /seats (generateSeatLabels phía server). */
  maGhe: string;
  daBan: boolean;
  /** Nhãn hiển thị theo sơ đồ cũ (giường A/B, limousine/xe 01, 02, …) — tách khỏi mã hệ thống. */
  hienThiGhe?: string;
};

type SeatLayout = {
  tangDuoi?: UiSeat[][];
  tangTren?: UiSeat[][];
  single?: UiSeat[][];
  singleType?: 'limousine' | 'seat';
};

type BookingState = {
  tripType?: 'one-way' | 'round-trip';
  trip?: TripPayload;
  selectedSeats?: string[];
  outboundTrip?: TripPayload;
  returnTrip?: TripPayload;
  selectedSeatsOutbound?: string[];
  selectedSeatsReturn?: string[];
  homeRestoreState?: unknown;
};

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

type CustomerProfileResponse = {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  status: string;
};

type CreatedTicket = {
  id: number;
  maVe: string;
  trangThai: string;
};

const BOOKING_PHONE_KEY = 'banvexe_booking_phone';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

const formatDateTime = (trip?: TripPayload) => {
  if (!trip) return '';
  const [y, m, d] = (trip.ngayDi || '').split('-');
  return `${trip.gioDi?.slice(0, 5) || '--:--'} ${d && m && y ? `${d}/${m}/${y}` : ''}`.trim();
};

const toDateTimeMs = (trip?: TripPayload) => {
  if (!trip?.ngayDi || !trip?.gioDi) return null;
  const parsed = new Date(`${trip.ngayDi}T${trip.gioDi}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
};

const norm = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const pickSeat = (apiSeats: SeatStatus[], idx: number): UiSeat => {
  const s = apiSeats[idx];
  if (!s) return { maGhe: '', daBan: true };
  return { maGhe: s.maGhe, daBan: s.daBan };
};

const withHienThi = (ui: UiSeat, hienThiGhe: string): UiSeat => ({ ...ui, hienThiGhe });

const buildSleeperLayout = (apiSeats: SeatStatus[]): SeatLayout => {
  const total = apiSeats.length;
  const lowerCount = Math.ceil(total / 2);
  const upperCount = total - lowerCount;
  const buildRows = (count: number, startIdx: number, prefix: 'A' | 'B') => {
    const rows: UiSeat[][] = [];
    if (count > 0) {
      rows.push(
        Array.from({ length: Math.min(2, count) }, (_, i) =>
          withHienThi(pickSeat(apiSeats, startIdx + i), `${prefix}${String(i + 1).padStart(2, '0')}`),
        ),
      );
    }
    let used = rows[0]?.length ?? 0;
    while (used < count) {
      const rowSize = Math.min(3, count - used);
      rows.push(
        Array.from({ length: rowSize }, (_, i) =>
          withHienThi(pickSeat(apiSeats, startIdx + used + i), `${prefix}${String(used + i + 1).padStart(2, '0')}`),
        ),
      );
      used += rowSize;
    }
    return rows;
  };
  return { tangDuoi: buildRows(lowerCount, 0, 'A'), tangTren: buildRows(upperCount, lowerCount, 'B') };
};

const buildLimousineLayout = (apiSeats: SeatStatus[]): SeatLayout => {
  const total = apiSeats.length;
  const rows: UiSeat[][] = [];
  const toSeat = (idx: number) => withHienThi(pickSeat(apiSeats, idx), String(idx + 1).padStart(2, '0'));
  for (let idx = 0; idx < total; idx += 2) {
    const row: UiSeat[] = [toSeat(idx)];
    if (idx + 1 < total) row.push(toSeat(idx + 1));
    rows.push(row);
  }
  return { single: rows, singleType: 'limousine' };
};

const buildSeatBusLayout = (apiSeats: SeatStatus[]): SeatLayout => {
  const rows: UiSeat[][] = [];
  const total = apiSeats.length;
  const rowCount = Math.ceil(total / 4);
  for (let row = 0; row < rowCount; row++) {
    const base = row * 4;
    const order = [3, 2, 1, 0];
    const rowSeats = order
      .map((offset) => {
        const idx = base + offset;
        if (idx >= total) return null;
        return withHienThi(pickSeat(apiSeats, idx), String(idx + 1).padStart(2, '0'));
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

const collectHienThiByMaGhe = (layout: SeatLayout) => {
  const m = new Map<string, string>();
  const visit = (rows?: UiSeat[][]) => {
    rows?.forEach((row) =>
      row.forEach((s) => {
        if (s.maGhe) m.set(s.maGhe, s.hienThiGhe ?? s.maGhe);
      }),
    );
  };
  visit(layout.tangDuoi);
  visit(layout.tangTren);
  visit(layout.single);
  return m;
};

const displaySeatCodes = (maGheList: string[], map: Map<string, string>) =>
  maGheList.length ? maGheList.map((c) => map.get(c) ?? c).join(', ') : 'Chưa chọn';

const BookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as BookingState;

  const isRoundTrip = state.tripType === 'round-trip' && state.outboundTrip && state.returnTrip;
  const outboundTrip = (isRoundTrip ? state.outboundTrip : state.trip) as TripPayload | undefined;
  const returnTrip = (isRoundTrip ? state.returnTrip : undefined) as TripPayload | undefined;

  const [outboundMap, setOutboundMap] = useState<SeatMapResponse | null>(null);
  const [returnMap, setReturnMap] = useState<SeatMapResponse | null>(null);
  const [loadingOut, setLoadingOut] = useState(false);
  const [loadingRet, setLoadingRet] = useState(false);
  const [selectedOutboundSeats, setSelectedOutboundSeats] = useState<string[]>(state.selectedSeatsOutbound ?? state.selectedSeats ?? []);
  const [selectedReturnSeats, setSelectedReturnSeats] = useState<string[]>(state.selectedSeatsReturn ?? []);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [dangDatVe, setDangDatVe] = useState(false);

  useEffect(() => {
    const role = getStoredRole();
    if (!role) return;
    const bootstrapProfile = async () => {
      const storedName = getStoredName();
      const storedEmail = getStoredEmail();
      const storedPhone = getStoredPhone();
      const cachedPhone = localStorage.getItem(BOOKING_PHONE_KEY);
      const isLikelyEmail = (value?: string | null) => Boolean(value && value.includes('@'));

      try {
        const { data } = await api.get<ApiResponse<CustomerProfileResponse>>('/api/accounts/me/profile');
        const profile = data?.data;
        if (profile) {
          if (profile.fullName?.trim()) {
            setFullName(profile.fullName.trim());
          } else if (storedName && !isLikelyEmail(storedName)) {
            setFullName(storedName);
          }

          if (profile.email?.trim()) {
            setEmail(profile.email.trim());
          } else if (storedEmail) {
            setEmail(storedEmail);
          }

          if (profile.phone?.trim()) {
            const normalizedPhone = profile.phone.trim();
            setPhone(normalizedPhone);
            localStorage.setItem(BOOKING_PHONE_KEY, normalizedPhone);
          } else if (storedPhone?.trim()) {
            setPhone(storedPhone.trim());
          } else if (cachedPhone) {
            setPhone(cachedPhone);
          }
          return;
        }
      } catch {
        // fallback to locally cached values
      }

      if (storedName && !isLikelyEmail(storedName)) setFullName(storedName);
      if (storedEmail) setEmail(storedEmail);
      if (storedPhone?.trim()) setPhone(storedPhone.trim());
      else if (cachedPhone) setPhone(cachedPhone);
    };
    void bootstrapProfile();
  }, []);

  useEffect(() => {
    if (!phone.trim()) {
      localStorage.removeItem(BOOKING_PHONE_KEY);
      return;
    }
    localStorage.setItem(BOOKING_PHONE_KEY, phone.trim());
  }, [phone]);

  useEffect(() => {
    if (!outboundTrip?.id) return;
    setLoadingOut(true);
    axios
      .get<{ data?: SeatMapResponse }>(`/api/catalog/trips/${outboundTrip.id}/seats`)
      .then((res) => setOutboundMap(res.data?.data ?? null))
      .finally(() => setLoadingOut(false));
  }, [outboundTrip?.id]);

  useEffect(() => {
    if (!returnTrip?.id) return;
    setLoadingRet(true);
    axios
      .get<{ data?: SeatMapResponse }>(`/api/catalog/trips/${returnTrip.id}/seats`)
      .then((res) => setReturnMap(res.data?.data ?? null))
      .finally(() => setLoadingRet(false));
  }, [returnTrip?.id]);

  const totalOutbound = (selectedOutboundSeats.length || 0) * Number(outboundTrip?.giaVe || 0);
  const totalReturn = (selectedReturnSeats.length || 0) * Number(returnTrip?.giaVe || 0);
  const totalAmount = totalOutbound + totalReturn;
  const outboundTime = toDateTimeMs(outboundTrip);
  const returnTime = toDateTimeMs(returnTrip);
  const invalidRoundTripOrder = Boolean(
    isRoundTrip && outboundTime != null && returnTime != null && returnTime <= outboundTime,
  );

  const routeName = useMemo(() => {
    if (!outboundTrip) return '';
    return outboundTrip.tenTuyen || `${outboundTrip.diemDi} - ${outboundTrip.diemDen}`;
  }, [outboundTrip]);

  const hienThiTheoMaGheDi = useMemo(() => {
    if (!outboundMap?.ghe || !outboundTrip) return new Map<string, string>();
    return collectHienThiByMaGhe(getSeatLayoutByVehicleType(outboundTrip.loaiXe || '', outboundMap.ghe));
  }, [outboundMap, outboundTrip]);

  const hienThiTheoMaGheVe = useMemo(() => {
    if (!returnMap?.ghe || !returnTrip) return new Map<string, string>();
    return collectHienThiByMaGhe(getSeatLayoutByVehicleType(returnTrip.loaiXe || '', returnMap.ghe));
  }, [returnMap, returnTrip]);

  const onSubmitPayment = () => {
    void (async () => {
      if (dangDatVe) return;
      setDangDatVe(true);
      try {
        if (!acceptedTerms) {
          window.alert('Vui lòng chấp nhận điều khoản trước khi thanh toán.');
          return;
        }
        if (!fullName.trim() || !phone.trim() || !email.trim()) {
          window.alert('Vui lòng nhập đầy đủ họ tên, số điện thoại và email.');
          return;
        }
        if (!selectedOutboundSeats.length) {
          window.alert('Vui lòng chọn ghế cho chuyến đi.');
          return;
        }
        if (isRoundTrip && !selectedReturnSeats.length) {
          window.alert('Vui lòng chọn ghế cho chuyến về.');
          return;
        }
        if (invalidRoundTripOrder) {
          window.alert('Thời gian chuyến về phải sau chuyến đi.');
          return;
        }

        if (!outboundTrip?.id) {
          window.alert('Thiếu thông tin chuyến đi.');
          return;
        }

        const createdTickets: CreatedTicket[] = [];
        const noteBase = `Chờ thanh toán | KH: ${fullName.trim()} - ${phone.trim()} - ${email.trim()}`;

        const outboundRes = await api.post<ApiResponse<CreatedTicket>>('/api/me/booking/tickets', {
          chuyenXeId: outboundTrip.id,
          maGhe: selectedOutboundSeats,
          ghiChu: noteBase,
        });
        if (outboundRes.data?.data) createdTickets.push(outboundRes.data.data);

        if (isRoundTrip && returnTrip?.id && selectedReturnSeats.length > 0) {
          const returnRes = await api.post<ApiResponse<CreatedTicket>>('/api/me/booking/tickets', {
            chuyenXeId: returnTrip.id,
            maGhe: selectedReturnSeats,
            ghiChu: `${noteBase} | Khứ hồi - chiều về`,
          });
          if (returnRes.data?.data) createdTickets.push(returnRes.data.data);
        }

        const tripType: 'one-way' | 'round-trip' = isRoundTrip ? 'round-trip' : 'one-way';
        const payload = {
          tripType,
          customer: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: email.trim(),
          },
          createdTickets,
          outboundTrip,
          returnTrip,
          selectedOutboundSeats,
          selectedReturnSeats,
          totalOutbound,
          totalReturn,
          totalAmount,
        };

        navigate('/thanh-toan', { state: payload });
      } catch (error) {
        const axiosErr = error as { response?: { data?: { message?: string } } };
        const msg = axiosErr.response?.data?.message || 'Không thể đặt vé lúc này. Vui lòng thử lại.';
        window.alert(msg);
      } finally {
        setDangDatVe(false);
      }
    })();
  };

  const renderSeatSection = (
    trip: TripPayload | undefined,
    map: SeatMapResponse | null,
    loading: boolean,
    selectedSeats: string[],
    setSelectedSeats: React.Dispatch<React.SetStateAction<string[]>>,
    title: string,
  ) => {
    if (!trip) return null;
    const onToggleSeat = (seat: SeatStatus) => {
      if (seat.daBan) return;
      setSelectedSeats((prev) => {
        if (prev.includes(seat.maGhe)) return prev.filter((s) => s !== seat.maGhe);
        if (prev.length >= 5) {
          window.alert('Bạn chỉ có thể chọn tối đa 5 ghế cho mỗi chiều.');
          return prev;
        }
        return [...prev, seat.maGhe];
      });
    };

    return (
      <div className="flex-1 rounded-lg border border-gray-200 p-3">
        <p className="text-base font-semibold text-gray-800">{title}</p>
        <p className="mb-3 text-xs text-gray-500">{trip.tenTuyen}</p>
        {loading && <p className="text-sm text-gray-500">Đang tải sơ đồ ghế...</p>}
        {!loading && !map && <p className="text-sm text-gray-500">Không tải được sơ đồ ghế.</p>}
        {map && (
          <>
            {(() => {
              const layout = getSeatLayoutByVehicleType(trip.loaiXe || '', map.ghe);
              const renderSeatButton = (seat: SeatStatus & { hienThiGhe?: string }, sizeClass = 'h-9 w-9 md:h-10 md:w-10') => {
                const isSelected = selectedSeats.includes(seat.maGhe);
                const cls = seat.daBan
                  ? 'cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400'
                  : isSelected
                    ? 'border-[#ef5222] bg-[#fff2ed] text-[#ef5222]'
                    : 'border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100';
                return (
                  <button key={seat.maGhe} type="button" disabled={seat.daBan} onClick={() => onToggleSeat(seat)} className={`${sizeClass} rounded-md border-2 text-[11px] font-bold ${cls}`}>
                    {seat.hienThiGhe ?? seat.maGhe}
                  </button>
                );
              };
              return (
                <>
                  {layout.tangDuoi && layout.tangTren && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="mb-2 text-center text-xs font-semibold text-gray-700">Tầng dưới</p>
                        <div className="space-y-2">{layout.tangDuoi.map((row, idx) => <div key={`duoi-${idx}`} className="grid w-fit grid-cols-3 gap-2">{row.length === 2 ? <><>{renderSeatButton(row[0] as SeatStatus)}</><div className="h-9 w-9 md:h-10 md:w-10" />{renderSeatButton(row[1] as SeatStatus)}</> : row.map((s) => renderSeatButton(s as SeatStatus))}</div>)}</div>
                      </div>
                      <div>
                        <p className="mb-2 text-center text-xs font-semibold text-gray-700">Tầng trên</p>
                        <div className="space-y-2">{layout.tangTren.map((row, idx) => <div key={`tren-${idx}`} className="grid w-fit grid-cols-3 gap-2">{row.length === 2 ? <><>{renderSeatButton(row[0] as SeatStatus)}</><div className="h-9 w-9 md:h-10 md:w-10" />{renderSeatButton(row[1] as SeatStatus)}</> : row.map((s) => renderSeatButton(s as SeatStatus))}</div>)}</div>
                      </div>
                    </div>
                  )}
                  {layout.single && (
                    <div className="space-y-2">
                      {layout.single.map((row, idx) => (
                        <div key={`single-${idx}`} className={layout.singleType === 'seat' ? 'flex items-center justify-center gap-6' : 'grid w-fit grid-cols-3 gap-2'}>
                          {layout.singleType === 'seat' ? (
                            <>
                              <div className="flex gap-2">{row.slice(0, 2).map((s) => renderSeatButton(s as SeatStatus))}</div>
                              <div className="flex gap-2">{row.slice(2).map((s) => renderSeatButton(s as SeatStatus))}</div>
                            </>
                          ) : row.length === 2 ? (
                            <>
                              {renderSeatButton(row[0] as SeatStatus)}
                              <div className="h-9 w-9 md:h-10 md:w-10" />
                              {renderSeatButton(row[1] as SeatStatus)}
                            </>
                          ) : (
                            row.map((s) => renderSeatButton(s as SeatStatus))
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>
    );
  };

  if (!outboundTrip) {
    return (
      <div className="min-h-[65vh] bg-[#f3f3f5] px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-orange-100 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-800">Không có dữ liệu chuyến đi để đặt vé.</p>
          <button type="button" onClick={() => navigate('/')} className="mt-5 rounded-full bg-[#ef5222] px-6 py-2 text-sm font-semibold text-white hover:bg-[#d84a1e]">Về trang chủ</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f3f3f5] pb-10">
      <div className="bg-gradient-to-b from-[#ff7a00] via-[#ef5222] to-[#df3b18] px-4 py-7 text-white">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() =>
              navigate('/', {
                state: {
                  homeRestoreState: {
                    ...(state.homeRestoreState as Record<string, unknown>),
                    focusTripId: (isRoundTrip ? returnTrip?.id : outboundTrip?.id) ?? null,
                  },
                },
              })
            }
            className="mb-2 text-sm hover:underline"
          >
            Quay lại
          </button>
          <h1 className="text-center text-3xl font-bold">{routeName}</h1>
        </div>
      </div>

      <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-5 px-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-col gap-4">
              <div className={`grid gap-4 ${isRoundTrip ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
                {renderSeatSection(
                  outboundTrip,
                  outboundMap,
                  loadingOut,
                  selectedOutboundSeats,
                  setSelectedOutboundSeats,
                  isRoundTrip ? 'Chọn ghế - Chuyến đi' : 'Chọn ghế',
                )}
                {isRoundTrip &&
                  renderSeatSection(
                  returnTrip,
                  returnMap,
                  loadingRet,
                  selectedReturnSeats,
                  setSelectedReturnSeats,
                  'Chọn ghế - Chuyến về',
                )}
              </div>
              <div className="rounded-lg border border-gray-200 bg-[#fafafa] p-3 text-sm">
                <p className="mb-2 font-semibold text-gray-700">Chú thích</p>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                  <span className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-gray-300" />Đã bán</span>
                  <span className="flex items-center gap-2"><span className="h-4 w-4 rounded border border-blue-300 bg-blue-50" />Còn trống</span>
                  <span className="flex items-center gap-2"><span className="h-4 w-4 rounded border border-[#ef5222] bg-[#fff2ed]" />Đang chọn</span>
                </div>
              </div>
            </div>
          </section>
          {invalidRoundTripOrder && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              Chuyến về phải có thời gian xuất bến sau chuyến đi.
            </div>
          )}
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-2xl font-bold text-gray-800">Thông tin khách hàng</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2" placeholder="Họ và tên *" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2" placeholder="Số điện thoại *" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 md:col-span-2" placeholder="Email *" />
            </div>
            <label className="mt-4 flex items-start gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1" />
              <span>Chấp nhận điều khoản đặt vé và chính sách bảo mật thông tin.</span>
            </label>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-2xl font-bold text-gray-800">Thông tin đón trả</h3>
            <div className={`mt-4 grid gap-4 ${isRoundTrip ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-semibold text-gray-500">{isRoundTrip ? 'CHUYẾN ĐI' : 'ĐIỂM ĐÓN/TRẢ'}</p>
                <p className="mt-2 text-sm">{outboundTrip.diemDi} → {outboundTrip.diemDen}</p>
              </div>
              {isRoundTrip && returnTrip && (
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold text-gray-500">CHUYẾN VỀ</p>
                  <p className="mt-2 text-sm">{returnTrip.diemDi} → {returnTrip.diemDen}</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-800">Thông tin chuyến đi</h3>
              <span className="text-lg text-[#ef5222]">Chi tiết</span>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Tuyến xe</span><span className="font-semibold">{outboundTrip.tenTuyen}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Thời gian xuất bến</span><span className="font-semibold text-[#00613d]">{formatDateTime(outboundTrip)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Số lượng ghế</span><span className="font-semibold">{selectedOutboundSeats.length} Ghế</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Số ghế</span><span className="font-semibold">{displaySeatCodes(selectedOutboundSeats, hienThiTheoMaGheDi)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tổng tiền lượt đi</span><span className="font-semibold text-[#00613d]">{formatCurrency(totalOutbound)}</span></div>
            </div>
          </section>

          {isRoundTrip && returnTrip && (
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-800">Thông tin chuyến đi</h3>
                <span className="text-lg text-[#ef5222]">Chi tiết</span>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Tuyến xe</span><span className="font-semibold">{returnTrip.tenTuyen}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Thời gian xuất bến</span><span className="font-semibold text-[#00613d]">{formatDateTime(returnTrip)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Số lượng ghế</span><span className="font-semibold">{selectedReturnSeats.length} Ghế</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Số ghế</span><span className="font-semibold">{displaySeatCodes(selectedReturnSeats, hienThiTheoMaGheVe)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tổng tiền lượt đi</span><span className="font-semibold text-[#00613d]">{formatCurrency(totalReturn)}</span></div>
              </div>
            </section>
          )}

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-2xl font-bold text-gray-800">Chi tiết giá</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Giá vé lượt đi 1</span><span>{formatCurrency(totalOutbound)}</span></div>
              {isRoundTrip && <div className="flex justify-between"><span className="text-gray-500">Giá vé lượt đi 2</span><span>{formatCurrency(totalReturn)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Phí thanh toán</span><span>0đ</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-[#ef5222]"><span>Tổng tiền</span><span>{formatCurrency(totalAmount)}</span></div>
            </div>
          </section>

          {!acceptedTerms && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Bạn cần chấp nhận điều khoản trước khi thanh toán.</span>
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
            <Link to="/" className="rounded-full border border-gray-300 px-6 py-2 font-semibold text-gray-600 hover:bg-gray-100">Hủy</Link>
            <button
              type="button"
              disabled={
                dangDatVe ||
                !acceptedTerms ||
                selectedOutboundSeats.length === 0 ||
                (isRoundTrip && selectedReturnSeats.length === 0) ||
                invalidRoundTripOrder
              }
              onClick={onSubmitPayment}
              className="rounded-full bg-[#ef5222] px-8 py-2 font-semibold text-white hover:bg-[#d84a1e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {dangDatVe ? 'Đang xử lý...' : 'Thanh toán'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
