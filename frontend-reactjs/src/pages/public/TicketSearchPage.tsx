import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Search, Ticket, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import TripTrackingSection from '../../components/maps/TripTrackingSection';

type TicketSearchLocationState = {
  highlightedTicketCodes?: string[];
  prefilledPhone?: string;
  deferredSuccess?: boolean;
};

type TripSummary = {
  id?: number;
  tenTuyen?: string;
  diemDi?: string;
  diemDen?: string;
  ngayDi?: string;
  gioDi?: string;
  gioDenDuKien?: string;
  thoiGianDuKienPhut?: number;
  khoangCach?: number;
  giaVe?: number;
  loaiXe?: string;
  bienSo?: string;
  tongSoGhe?: number;
  soGheTrong?: number;
  trangThaiChuyen?: string;
};

type TicketLookup = {
  id: number;
  maVe: string;
  trangThai: string;
  tongTien: number;
  ngayDat?: string;
  holdExpiresAt?: string;
  ghiChu?: string;
  hoTenKhach?: string;
  soDienThoaiKhach?: string;
  emailKhach?: string;
  maGhe?: string[];
  chuyen?: TripSummary;
};

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

const formatDateTime = (ngayDi?: string, gioDi?: string) => {
  if (!ngayDi) return gioDi?.slice(0, 5) || '--:--';
  const [y, m, d] = ngayDi.split('-');
  return `${gioDi?.slice(0, 5) || '--:--'} ${d && m && y ? `${d}/${m}/${y}` : ''}`.trim();
};

const formatInstant = (value?: string) => {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${d.toLocaleDateString('vi-VN')}`;
};

const buildTicketQrUrl = (ticketCode?: string) => {
  if (!ticketCode) return '';
  const payload = `BANVEXE:${ticketCode}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
};

const isPendingPayment = (status?: string) => status === 'CHO_THANH_TOAN' || status === 'DAT_TRUOC';

const canShowTripTracking = (status?: string) => status !== 'DA_HUY';

const TicketSearchPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as TicketSearchLocationState;
  const highlightedCodes = useMemo(
    () => (state.highlightedTicketCodes ?? []).filter((c) => typeof c === 'string' && c.trim().length > 0),
    [state.highlightedTicketCodes],
  );
  const prefilledPhoneFromNav = (state.prefilledPhone ?? '').trim();
  const deferredSuccess = Boolean(state.deferredSuccess);

  const [phone, setPhone] = useState(prefilledPhoneFromNav);
  const [ticketCode, setTicketCode] = useState(highlightedCodes[0] ?? '');
  const autoLookupAfterPaymentRef = useRef(false);
  const [dangTraCuu, setDangTraCuu] = useState(false);
  const [ticketResult, setTicketResult] = useState<TicketLookup | null>(null);
  const [traCuuError, setTraCuuError] = useState('');
  const [dangHuy, setDangHuy] = useState(false);
  const [huyError, setHuyError] = useState('');
  const [huyMessage, setHuyMessage] = useState('');

  const invoiceTitle = useMemo(() => {
    if (!ticketResult) return 'Tra cứu vé';
    return ticketResult.chuyen?.tenTuyen || `${ticketResult.chuyen?.diemDi || ''} - ${ticketResult.chuyen?.diemDen || ''}`;
  }, [ticketResult]);

  const runTicketLookup = (soDienThoai: string, maVe: string) => {
    void (async () => {
      const p = soDienThoai.trim();
      const m = maVe.trim();
      if (!m || !p) {
        setTraCuuError('Vui lòng nhập đầy đủ số điện thoại và mã vé để tra cứu.');
        setTicketResult(null);
        return;
      }
      setDangTraCuu(true);
      setTraCuuError('');
      try {
        const detailRes = await api.get<ApiResponse<TicketLookup>>('/api/public/booking/tickets/lookup', {
          params: {
            phone: p,
            maVe: m,
          },
        });
        const detail = detailRes.data?.data;
        if (!detail) {
          setTicketResult(null);
          setTraCuuError('Không tìm thấy vé phù hợp.');
          return;
        }
        setTicketResult(detail);
        setHuyError('');
        setHuyMessage('');
      } catch (error) {
        const axiosErr = error as { response?: { data?: { message?: string } } };
        setTicketResult(null);
        setTraCuuError(axiosErr.response?.data?.message || 'Không thể tra cứu vé. Vui lòng thử lại.');
      } finally {
        setDangTraCuu(false);
      }
    })();
  };

  const onSearchTicket = () => runTicketLookup(phone, ticketCode);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const maVeFromUrl = params.get('maVe')?.trim();
    if (maVeFromUrl) {
      setTicketCode(maVeFromUrl);
    }
  }, [location.search]);

  useEffect(() => {
    if (autoLookupAfterPaymentRef.current) return;
    const p = prefilledPhoneFromNav;
    const code = highlightedCodes[0]?.trim();
    if (!p || !code) return;
    autoLookupAfterPaymentRef.current = true;
    setPhone(p);
    setTicketCode(code);
    runTicketLookup(p, code);
  }, [highlightedCodes, prefilledPhoneFromNav]);

  const canRequestCancel = (ticket?: TicketLookup | null) => {
    if (!ticket) return false;
    if (isPendingPayment(ticket.trangThai)) return true;
    if (ticket.trangThai === 'DA_THANH_TOAN') return true;
    return false;
  };

  const onCancelTicket = () => {
    void (async () => {
      if (!ticketResult) return;
      const maVe = ticketResult.maVe?.trim();
      const soDienThoai = phone.trim();
      if (!maVe || !soDienThoai) {
        setHuyError('Vui lòng nhập số điện thoại và mã vé để hủy.');
        return;
      }
      if (!canRequestCancel(ticketResult)) {
        setHuyError('Vé không thể hủy ở trạng thái hiện tại.');
        return;
      }
      const msg =
        isPendingPayment(ticketResult.trangThai)
          ? ticketResult.trangThai === 'DAT_TRUOC'
            ? 'Xác nhận hủy vé đặt trước?'
            : 'Xác nhận hủy vé chờ thanh toán?'
          : 'Gửi yêu cầu hủy vé? Nhân viên sẽ duyệt.';
      if (!window.confirm(msg)) return;
      setDangHuy(true);
      setHuyError('');
      setHuyMessage('');
      try {
        const res = await api.post<ApiResponse<null>>('/api/public/booking/tickets/cancel', {
          soDienThoai,
          maVe,
        });
        setHuyMessage(res.data?.message || 'Đã gửi yêu cầu hủy vé.');
        const detailRes = await api.get<ApiResponse<TicketLookup>>('/api/public/booking/tickets/lookup', {
          params: {
            phone: soDienThoai,
            maVe,
          },
        });
        setTicketResult(detailRes.data?.data ?? null);
      } catch (error) {
        const axiosErr = error as { response?: { data?: { message?: string } } };
        setHuyError(axiosErr.response?.data?.message || 'Không thể hủy vé. Vui lòng thử lại.');
      } finally {
        setDangHuy(false);
      }
    })();
  };

  const onRetryPayment = () => {
    if (!ticketResult || !isPendingPayment(ticketResult.trangThai) || !ticketResult.chuyen?.id) return;
    navigate('/thanh-toan', {
      state: {
        tripType: 'one-way',
        customer: {
          fullName: ticketResult.hoTenKhach || '',
          phone: ticketResult.soDienThoaiKhach || phone.trim(),
          email: ticketResult.emailKhach || '',
        },
        createdTickets: [
          {
            id: ticketResult.id,
            maVe: ticketResult.maVe,
            trangThai: ticketResult.trangThai,
          },
        ],
        outboundTrip: {
          id: ticketResult.chuyen.id,
          tenTuyen: ticketResult.chuyen.tenTuyen || '',
          diemDi: ticketResult.chuyen.diemDi || '',
          diemDen: ticketResult.chuyen.diemDen || '',
          ngayDi: ticketResult.chuyen.ngayDi || '',
          gioDi: ticketResult.chuyen.gioDi || '',
          giaVe: Number(ticketResult.chuyen.giaVe || ticketResult.tongTien || 0),
        },
        selectedOutboundSeats: ticketResult.maGhe || [],
        totalOutbound: Number(ticketResult.tongTien || 0),
        totalAmount: Number(ticketResult.tongTien || 0),
      },
    });
  };

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-[#fff8f5] to-white py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#ef5222]">Tra cứu vé</p>
          <h2 className="mt-2 text-3xl font-bold text-[#00613d]">Tìm thông tin đặt vé nhanh chóng</h2>
          <p className="mt-3 text-gray-500">Nhập số điện thoại và mã vé để xem lại thông tin chuyến đi của bạn.</p>
        </div>

        <div className="w-full rounded-3xl bg-white p-6 shadow-xl shadow-orange-100/60 ring-1 ring-[#ef5222]/10 md:p-8">
          {deferredSuccess && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Đặt trước thành công! Ghế đã được giữ. Vui lòng thanh toán trước hạn (hệ thống sẽ gửi email nhắc).
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="lg:col-span-5">
              <h3 className="mb-4 text-xl font-semibold text-[#ef5222]">Tra cứu vé</h3>
              <div className="space-y-4">
                <div className="relative flex overflow-hidden rounded-2xl border border-gray-200 bg-[#fdf8f5] shadow-sm">
                  <div className="flex items-center justify-center border-r border-gray-200 bg-white px-4">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Nhập số điện thoại"
                    className="flex-1 bg-transparent px-4 py-4 text-sm outline-none placeholder:text-gray-400"
                  />
                </div>

                <div className="relative flex overflow-hidden rounded-2xl border border-gray-200 bg-[#fdf8f5] shadow-sm">
                  <div className="flex items-center justify-center border-r border-gray-200 bg-white px-4">
                    <Ticket className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={ticketCode}
                    onChange={(e) => setTicketCode(e.target.value)}
                    placeholder="Nhập mã vé"
                    className="flex-1 bg-transparent px-4 py-4 text-sm outline-none placeholder:text-gray-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={onSearchTicket}
                  disabled={dangTraCuu}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ef5222] py-4 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-[#d84a1e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Search className="h-4 w-4" />
                  {dangTraCuu ? 'Đang tra cứu...' : 'Tra cứu'}
                </button>
              </div>

              {highlightedCodes.length > 0 && (
                <div className="mt-5 rounded-2xl border border-[#ef5222]/20 bg-[#fff7f3] p-4">
                  <p className="text-sm font-semibold text-[#ef5222]">Vé vừa thanh toán thành công</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {highlightedCodes.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setTicketCode(code)}
                        className={`rounded-full border px-2 py-1 text-xs font-semibold transition ${
                          ticketCode === code
                            ? 'border-[#ef5222] bg-[#ef5222] text-white'
                            : 'border-[#ef5222]/30 bg-white text-[#ef5222] hover:bg-[#fff0ea]'
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {traCuuError && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{traCuuError}</div>}
            </section>

            <section className="rounded-3xl border border-gray-100 bg-[#fffdfc] p-5 shadow-sm lg:col-span-7">
              <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff0ea] text-[#ef5222]">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Kết quả vé</p>
                  <h3 className="text-xl font-bold text-gray-800">{ticketResult ? `Vé ${ticketResult.maVe}` : invoiceTitle}</h3>
                </div>
              </div>

              {!ticketResult ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-500">
                  Thông tin vé sẽ hiển thị ở đây sau khi tra cứu thành công.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#ef5222]/15 bg-[#fff7f3] p-4">
                    <p className="text-sm text-gray-500">Mã vé</p>
                    <p className="mt-1 font-mono text-lg font-bold text-[#ef5222]">{ticketResult.maVe}</p>
                    <p className="mt-3 text-sm text-gray-500">Trạng thái</p>
                    <p
                      className={`font-semibold ${
                        ticketResult.trangThai === 'DA_HUY' ? 'text-red-600' : 'text-gray-800'
                      }`}
                    >
                      {ticketResult.trangThai}
                    </p>
                    <p className="mt-3 text-sm text-gray-500">Ngày đặt</p>
                    <p className="font-semibold text-gray-800">{formatInstant(ticketResult.ngayDat)}</p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Khách hàng</p>
                    <p className="font-semibold text-gray-800">{ticketResult.hoTenKhach || '--'}</p>
                    <p className="mt-3 text-sm text-gray-500">Số điện thoại</p>
                    <p className="font-semibold text-gray-800">{ticketResult.soDienThoaiKhach || '--'}</p>
                    <p className="mt-3 text-sm text-gray-500">Email</p>
                    <p className="break-all font-semibold text-gray-800">{ticketResult.emailKhach || '--'}</p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 md:col-span-2">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm text-gray-500">Thông tin chuyến đi</p>
                      <span className="rounded-full bg-[#f0faf5] px-3 py-1 text-xs font-semibold text-[#00613d]">{ticketResult.chuyen?.trangThaiChuyen || 'UNKNOWN'}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-gray-500">Tuyến</p>
                        <p className="font-semibold text-gray-800">{ticketResult.chuyen?.tenTuyen || `${ticketResult.chuyen?.diemDi || ''} - ${ticketResult.chuyen?.diemDen || ''}`}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Khởi hành</p>
                        <p className="font-semibold text-gray-800">{formatDateTime(ticketResult.chuyen?.ngayDi, ticketResult.chuyen?.gioDi)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Đến dự kiến</p>
                        <p className="font-semibold text-gray-800">{formatDateTime(ticketResult.chuyen?.ngayDi, ticketResult.chuyen?.gioDenDuKien)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Ghế</p>
                        <p className="font-semibold text-gray-800">{ticketResult.maGhe?.join(', ') || '--'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">Tổng tiền vé đã đặt</p>
                      <p className="text-2xl font-extrabold text-[#e45a2f]">{formatCurrency(ticketResult.tongTien)}</p>
                    </div>
                    {ticketResult.ghiChu && <p className="mt-3 text-sm text-gray-500">Ghi chú: {ticketResult.ghiChu}</p>}
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        {isPendingPayment(ticketResult.trangThai) && (
                          <button
                            type="button"
                            onClick={onRetryPayment}
                            className="rounded-full border border-[#ef5222] bg-white px-4 py-2 text-sm font-semibold text-[#ef5222] transition hover:bg-[#fff0ea]"
                          >
                            {ticketResult.trangThai === 'DAT_TRUOC' ? 'Thanh toán ngay' : 'Thanh toán lại'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={onCancelTicket}
                          disabled={dangHuy || !canRequestCancel(ticketResult)}
                          className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {dangHuy ? 'Đang xử lý...' : 'Hủy vé'}
                        </button>
                      </div>
                      <div className="text-sm">
                        {huyMessage && <span className="text-green-700">{huyMessage}</span>}
                        {huyError && <span className="text-red-600">{huyError}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 md:col-span-2">
                    <p className="text-sm text-gray-500">Mã QR vé</p>
                    <div className="mt-3 flex flex-col items-center gap-3 rounded-xl bg-[#fafafa] p-4">
                      <img
                        src={buildTicketQrUrl(ticketResult.maVe)}
                        alt={`QR ${ticketResult.maVe}`}
                        className="h-44 w-44 rounded-lg border border-gray-200 bg-white p-2"
                        loading="lazy"
                      />
                      <p className="text-xs text-gray-500">
                        Nhân viên có thể quét QR hoặc nhập mã vé <span className="font-mono font-semibold">{ticketResult.maVe}</span>.
                      </p>
                    </div>
                  </div>

                  {ticketResult.chuyen?.id && canShowTripTracking(ticketResult.trangThai) ? (
                    <TripTrackingSection tripId={ticketResult.chuyen.id} className="md:col-span-2" />
                  ) : null}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketSearchPage;
