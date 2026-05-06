import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { getStoredRole } from '../../auth/storage';

type TripPayload = {
  id: number;
  tenTuyen: string;
  diemDi: string;
  diemDen: string;
  ngayDi: string;
  gioDi: string;
  giaVe: number;
};

type CreatedTicket = {
  id: number;
  maVe: string;
  trangThai: string;
  ngayDat?: string;
};

type PaymentState = {
  tripType: 'one-way' | 'round-trip';
  customer: {
    fullName: string;
    phone: string;
    email: string;
  };
  createdTickets?: CreatedTicket[];
  outboundTrip?: TripPayload;
  returnTrip?: TripPayload;
  selectedOutboundSeats?: string[];
  selectedReturnSeats?: string[];
  totalOutbound?: number;
  totalReturn?: number;
  totalAmount?: number;
};

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

type PayOsLinkResponse = {
  orderCode: number;
  checkoutUrl: string;
  qrCode?: string;
};

type PayOsConfirmResponse = {
  orderCode: number;
  paymentStatus: string;
  paid: boolean;
};

const methods = [
  'PayOS',
];
const PAYMENT_STATE_STORAGE_KEY = 'banvexe_payment_state';
const HOLD_SECONDS = 5 * 60;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

const resolvePayOsQrImage = (qrCode: string | undefined, checkoutUrl: string) => {
  if (qrCode && (qrCode.startsWith('http://') || qrCode.startsWith('https://') || qrCode.startsWith('data:image/'))) {
    return qrCode;
  }
  const payload = qrCode && qrCode.trim().length > 0 ? qrCode.trim() : checkoutUrl;
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(payload)}`;
};

const formatDateTime = (trip?: TripPayload) => {
  if (!trip) return '';
  const [y, m, d] = (trip.ngayDi || '').split('-');
  return `${trip.gioDi?.slice(0, 5) || '--:--'} ${d && m && y ? `${d}/${m}/${y}` : ''}`.trim();
};

const calcInitialRemainingSeconds = (createdTickets?: CreatedTicket[]) => {
  if (!createdTickets?.length) return HOLD_SECONDS;
  const createdAtMs = createdTickets
    .map((ticket) => (ticket.ngayDat ? new Date(ticket.ngayDat).getTime() : NaN))
    .filter((value) => Number.isFinite(value));
  const origin = createdAtMs.length > 0 ? Math.min(...createdAtMs) : Date.now();
  const elapsed = Math.floor((Date.now() - origin) / 1000);
  return Math.max(0, HOLD_SECONDS - elapsed);
};

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const restoredState = useMemo(() => {
    if (location.state) return location.state as PaymentState;
    try {
      const raw = sessionStorage.getItem(PAYMENT_STATE_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PaymentState) : ({} as PaymentState);
    } catch {
      return {} as PaymentState;
    }
  }, [location.state]);
  const state = restoredState;
  const [method, setMethod] = useState('PayOS');
  const [dangThanhToan, setDangThanhToan] = useState(false);
  const [payOsCheckoutUrl, setPayOsCheckoutUrl] = useState('');
  const [payOsQrImage, setPayOsQrImage] = useState('');
  const [payOsOrderCode, setPayOsOrderCode] = useState<number | null>(null);
  const [payOsPaid, setPayOsPaid] = useState(false);
  const [payOsStatusText, setPayOsStatusText] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(() => calcInitialRemainingSeconds(restoredState.createdTickets));
  const timeoutHandledRef = useRef(false);
  const paidRedirectHandledRef = useRef(false);
  const isCanceledByPayOs = searchParams.get('payos') === 'cancel';

  const totalAmount = Number(state.totalAmount || 0);
  const totalOutbound = Number(state.totalOutbound || 0);
  const totalReturn = Number(state.totalReturn || 0);
  const seatsOut = state.selectedOutboundSeats ?? [];
  const seatsReturn = state.selectedReturnSeats ?? [];

  const title = useMemo(() => {
    if (!state.outboundTrip) return 'Thanh toán';
    return state.outboundTrip.tenTuyen || `${state.outboundTrip.diemDi} - ${state.outboundTrip.diemDen}`;
  }, [state.outboundTrip]);
  const countdownText = useMemo(() => {
    const mm = Math.floor(remainingSeconds / 60);
    const ss = remainingSeconds % 60;
    return `${mm.toString().padStart(2, '0')} : ${ss.toString().padStart(2, '0')}`;
  }, [remainingSeconds]);

  const hasPaymentState = Boolean(state.customer && state.outboundTrip && state.createdTickets?.length);
  const ticketCodes = (state.createdTickets ?? []).map((t) => t.maVe).filter(Boolean);

  useEffect(() => {
    if (!state.customer || !state.outboundTrip || !state.createdTickets?.length) return;
    sessionStorage.setItem(PAYMENT_STATE_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hasPaymentState) return;
    if (payOsPaid) return;
    if (remainingSeconds > 0 || timeoutHandledRef.current) return;
    timeoutHandledRef.current = true;
    void (async () => {
      try {
        for (const ticket of state.createdTickets ?? []) {
          await api.post<ApiResponse<null>>('/api/public/booking/tickets/cancel', {
            soDienThoai: state.customer.phone,
            maVe: ticket.maVe,
          });
        }
      } catch {
        // best-effort release pending tickets
      } finally {
        sessionStorage.removeItem(PAYMENT_STATE_STORAGE_KEY);
        window.alert('Đặt vé không thành công do quá thời gian giữ chỗ (05:00). Vui lòng đặt lại.');
        navigate('/', { replace: true });
      }
    })();
  }, [hasPaymentState, navigate, payOsPaid, remainingSeconds, state.createdTickets, state.customer?.phone]);

  useEffect(() => {
    if (!payOsOrderCode || payOsPaid) return;
    let active = true;
    const tick = async () => {
      try {
        const { data } = await api.post<ApiResponse<PayOsConfirmResponse>>('/api/public/booking/payos/confirm', {
          orderCode: payOsOrderCode,
        });
        const paid = Boolean(data?.data?.paid);
        const paymentStatus = data?.data?.paymentStatus || 'PENDING';
        if (!active) return;
        if (paid) {
          setPayOsPaid(true);
          setPayOsStatusText('Thanh toán thành công.');
          timeoutHandledRef.current = true;
          try {
            sessionStorage.removeItem(PAYMENT_STATE_STORAGE_KEY);
          } catch {
            // ignore storage errors
          }
          return;
        }
        setPayOsStatusText(`Đang chờ thanh toán... (trạng thái: ${paymentStatus})`);
      } catch {
        // ignore transient polling errors
      }
      if (active) {
        window.setTimeout(tick, 4000);
      }
    };
    void tick();
    return () => {
      active = false;
    };
  }, [payOsOrderCode, payOsPaid]);

  useEffect(() => {
    if (!payOsPaid || paidRedirectHandledRef.current) return;
    paidRedirectHandledRef.current = true;
    const highlightedTicketCodes = (state.createdTickets ?? [])
      .map((t) => (t?.maVe ?? '').trim())
      .filter((v) => v.length > 0);
    const timeoutId = window.setTimeout(() => {
      navigate('/tra-cuu-ve', {
        replace: true,
        state: highlightedTicketCodes.length > 0 ? { highlightedTicketCodes } : undefined,
      });
    }, 1200);
    return () => window.clearTimeout(timeoutId);
  }, [navigate, payOsPaid, state.createdTickets]);

  if (!hasPaymentState) {
    return (
      <div className="min-h-[65vh] bg-[#f3f3f5] px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-orange-100 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-800">Không có dữ liệu thanh toán. Vui lòng đặt vé và bấm Thanh toán ở trang đặt vé.</p>
          <button type="button" onClick={() => navigate('/')} className="mt-5 rounded-full bg-[#ef5222] px-6 py-2 text-sm font-semibold text-white hover:bg-[#d84a1e]">
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  const customer = state.customer as PaymentState['customer'];
  const outboundTrip = state.outboundTrip as TripPayload;

  const onFinish = () => {
    void (async () => {
      if (dangThanhToan || remainingSeconds <= 0) return;
      setDangThanhToan(true);
      try {
        const tickets = state.createdTickets ?? [];
        const payload = {
          ticketIds: tickets.map((ticket) => ticket.id),
          email: customer.email,
          soDienThoai: customer.phone,
          hoTen: customer.fullName,
        };
        const { data } = await api.post<ApiResponse<PayOsLinkResponse>>('/api/public/booking/payos/create-link', payload);
        const checkoutUrl = data?.data?.checkoutUrl;
        if (!checkoutUrl) {
          throw new Error('Không lấy được liên kết thanh toán');
        }
        sessionStorage.setItem(PAYMENT_STATE_STORAGE_KEY, JSON.stringify(state));
        setPayOsOrderCode(data?.data?.orderCode ?? null);
        setPayOsPaid(false);
        setPayOsStatusText('Đang chờ thanh toán...');
        setPayOsCheckoutUrl(checkoutUrl);
        setPayOsQrImage(resolvePayOsQrImage(data?.data?.qrCode, checkoutUrl));
      } catch (error) {
        const axiosErr = error as { response?: { data?: { message?: string } } };
        const msg = axiosErr.response?.data?.message || 'Không thể chuyển sang PayOS. Vui lòng thử lại.';
        window.alert(msg);
      } finally {
        setDangThanhToan(false);
      }
    })();
  };

  return (
    <div className="bg-[#f3f3f5] pb-10">
      <div className="bg-gradient-to-b from-[#ff7a00] via-[#ef5222] to-[#df3b18] px-4 py-7 text-white">
        <div className="mx-auto max-w-6xl">
          <button type="button" onClick={() => navigate(-1)} className="mb-2 inline-flex items-center gap-1 text-sm hover:underline">
            <ChevronLeft className="h-4 w-4" />
            Quay lại
          </button>
          <h1 className="text-center text-3xl font-bold">{title}</h1>
        </div>
      </div>

      <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-5 px-4 lg:grid-cols-12">
        <section className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-4">
          <h3 className="text-xl font-bold text-gray-800">Chọn phương thức thanh toán</h3>
          {ticketCodes.length > 0 && (
            <div className="mt-3 rounded-lg border border-[#0e5a32]/20 bg-[#f0faf5] p-3 text-sm">
              <p className="font-semibold text-[#0e5a32]">Mã vé (chờ thanh toán)</p>
              <p className="mt-1 break-all font-mono text-gray-800">{ticketCodes.join(', ')}</p>
            </div>
          )}
          <div className="mt-4 space-y-2">
            {methods.map((item) => (
              <label key={item} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50">
                <input type="radio" name="pay-method" checked={method === item} onChange={() => setMethod(item)} />
                <span className="text-sm font-medium text-gray-700">{item}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">Vé đã được lưu ở trạng thái chờ thanh toán. Chọn phương thức và hoàn tất theo hướng dẫn bên cạnh.</p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-4">
          <p className="text-center text-sm text-gray-500">Tổng tiền vé</p>
          <p className="text-center text-5xl font-extrabold text-[#e45a2f]">{formatCurrency(totalAmount)}</p>
          <div className="mt-4 rounded-xl bg-[#fafafa] p-4">
            <p className="mb-2 text-center text-sm text-[#e89b66]">Thời gian giữ chỗ còn lại {countdownText}</p>
            {isCanceledByPayOs && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                Thanh toán không thành công do bạn đã hủy trên PayOS. Nếu muốn thanh toán lại, vui lòng vào lịch sử vé.
              </div>
            )}
            <button
              type="button"
              disabled={dangThanhToan || remainingSeconds <= 0 || isCanceledByPayOs || payOsPaid}
              onClick={onFinish}
              className="mx-auto mt-2 block w-full max-w-xs rounded-full bg-[#ef5222] px-6 py-3 text-sm font-semibold text-white hover:bg-[#d84a1e] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {dangThanhToan ? 'Đang chuyển qua PayOS...' : 'Thanh toán với PayOS'}
            </button>
            {isCanceledByPayOs && (
              <button
                type="button"
                onClick={() => {
                  const role = getStoredRole();
                  navigate(role === 'KHACH_HANG' ? '/tai-khoan/lich-su-mua-ve' : '/tra-cuu-ve');
                }}
                className="mx-auto mt-2 block w-full max-w-xs rounded-full border border-[#ef5222] bg-white px-6 py-3 text-sm font-semibold text-[#ef5222] hover:bg-[#fff0ea]"
              >
                Thanh toán sau
              </button>
            )}
            {payOsCheckoutUrl && (
              <div className="mt-4 rounded-xl border border-[#0e5a32]/20 bg-[#f0faf5] p-4 text-center">
                <p className="text-sm font-semibold text-[#0e5a32]">Quét QR để thanh toán nhanh</p>
                <img
                  src={payOsQrImage}
                  alt="QR thanh toán PayOS"
                  className="mx-auto mt-3 h-52 w-52 rounded-lg border border-gray-200 bg-white p-2"
                />
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.open(payOsCheckoutUrl, '_blank', 'noopener,noreferrer')}
                    className="rounded-full bg-[#ef5222] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d84a1e]"
                  >
                    Mở trang PayOS
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(payOsCheckoutUrl);
                        window.alert('Đã sao chép link thanh toán.');
                      } catch {
                        window.alert('Không thể sao chép link. Vui lòng copy thủ công.');
                      }
                    }}
                    className="rounded-full border border-[#ef5222] bg-white px-4 py-2 text-xs font-semibold text-[#ef5222] hover:bg-[#fff0ea]"
                  >
                    Sao chép link
                  </button>
                </div>
                {payOsStatusText && (
                  <p className={`mt-3 text-sm font-semibold ${payOsPaid ? 'text-green-700' : 'text-[#0e5a32]'}`}>
                    {payOsStatusText}
                  </p>
                )}
              </div>
            )}
            <p className="mt-3 text-center text-sm font-medium text-[#0e5a32]">
              Bạn sẽ được chuyển đến cổng PayOS để hoàn tất thanh toán.
            </p>
          </div>
        </section>

        <section className="space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-2xl font-bold text-gray-800">Thông tin hành khách</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Họ và tên</span><span className="font-semibold">{customer.fullName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Số điện thoại</span><span className="font-semibold">{customer.phone}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-semibold">{customer.email}</span></div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-800">Thông tin chuyến đi</h3>
              <span className="text-lg text-[#ef5222]">Chi tiết</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Tuyến xe</span><span className="font-semibold">{outboundTrip.tenTuyen}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Thời gian xuất bến</span><span className="font-semibold text-[#00613d]">{formatDateTime(outboundTrip)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Số lượng ghế</span><span className="font-semibold">{seatsOut.length} Ghế</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Số ghế</span><span className="font-semibold">{seatsOut.join(', ') || 'Chưa chọn'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tổng tiền lượt đi</span><span className="font-semibold text-[#00613d]">{formatCurrency(totalOutbound)}</span></div>
            </div>
          </div>

          {state.tripType === 'round-trip' && state.returnTrip && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-800">Thông tin chuyến đi</h3>
                <span className="text-lg text-[#ef5222]">Chi tiết</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Tuyến xe</span><span className="font-semibold">{state.returnTrip.tenTuyen}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Thời gian xuất bến</span><span className="font-semibold text-[#00613d]">{formatDateTime(state.returnTrip)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Số lượng ghế</span><span className="font-semibold">{seatsReturn.length} Ghế</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Số ghế</span><span className="font-semibold">{seatsReturn.join(', ') || 'Chưa chọn'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tổng tiền lượt đi</span><span className="font-semibold text-[#00613d]">{formatCurrency(totalReturn)}</span></div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-2xl font-bold text-gray-800">Chi tiết giá</h3>
              <AlertCircle className="h-5 w-5 text-[#ef5222]" />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Giá vé lượt đi 1</span><span className="text-[#e45a2f]">{formatCurrency(totalOutbound)}</span></div>
              {state.tripType === 'round-trip' && <div className="flex justify-between"><span className="text-gray-500">Giá vé lượt đi 2</span><span className="text-[#e45a2f]">{formatCurrency(totalReturn)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Phí thanh toán</span><span>0đ</span></div>
              <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-2xl font-bold">
                <span className="text-gray-700">Tổng tiền</span>
                <span className="text-[#e45a2f]">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PaymentPage;
