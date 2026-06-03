import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import TripTrackingSection from '../../components/maps/TripTrackingSection';

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

type PayOsConfirmResponse = {
  orderCode: number;
  paymentStatus: string;
  paid: boolean;
};

type PaymentState = {
  createdTickets?: Array<{ maVe?: string | null }>;
  customer?: { phone?: string };
  outboundTrip?: { id?: number };
};

const PAYMENT_STATE_STORAGE_KEY = 'banvexe_payment_state';

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Đang xác nhận giao dịch với PayOS...');
  const [paid, setPaid] = useState(false);
  const [trackTripId, setTrackTripId] = useState<number | undefined>();
  const [highlightedTicketCodes, setHighlightedTicketCodes] = useState<string[]>([]);
  const [prefilledPhone, setPrefilledPhone] = useState('');

  const goToTicketLookup = () => {
    navigate('/tra-cuu-ve', {
      state:
        highlightedTicketCodes.length > 0 || prefilledPhone
          ? { highlightedTicketCodes, prefilledPhone }
          : undefined,
    });
  };

  useEffect(() => {
    void (async () => {
      const orderCodeRaw = searchParams.get('orderCode') || searchParams.get('ordercode');
      if (!orderCodeRaw) {
        setMessage('Không tìm thấy mã đơn thanh toán.');
        return;
      }

      const orderCode = Number(orderCodeRaw);
      if (!Number.isFinite(orderCode)) {
        setMessage('Mã đơn thanh toán không hợp lệ.');
        return;
      }

      try {
        const { data } = await api.post<ApiResponse<PayOsConfirmResponse>>('/api/public/booking/payos/confirm', {
          orderCode,
        });
        if (data?.data?.paid) {
          setPaid(true);
          setMessage('Thanh toán thành công! Bạn có thể theo dõi xe trên bản đồ bên dưới.');

          let codes = (searchParams.get('ticketCodes') ?? '')
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v.length > 0);
          let phone = '';

          try {
            const raw = sessionStorage.getItem(PAYMENT_STATE_STORAGE_KEY);
            if (raw) {
              const st = JSON.parse(raw) as PaymentState;
              if (codes.length === 0) {
                codes = (st.createdTickets ?? [])
                  .map((t) => (t?.maVe ?? '').trim())
                  .filter((v) => v.length > 0);
              }
              phone = (st.customer?.phone ?? '').trim();
              if (st.outboundTrip?.id) {
                setTrackTripId(st.outboundTrip.id);
              }
            }
          } catch {
            // ignore storage parse errors
          }

          setHighlightedTicketCodes(codes);
          setPrefilledPhone(phone);

          try {
            sessionStorage.removeItem(PAYMENT_STATE_STORAGE_KEY);
          } catch {
            // ignore
          }
          return;
        }
        setMessage(`Thanh toán chưa thành công (trạng thái: ${data?.data?.paymentStatus || 'UNKNOWN'}).`);
      } catch (error) {
        const axiosErr = error as { response?: { data?: { message?: string } } };
        setMessage(axiosErr.response?.data?.message || 'Không thể xác nhận thanh toán.');
      }
    })();
  }, [searchParams]);

  return (
    <div className="min-h-[65vh] bg-[#f3f3f5] px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="rounded-2xl border border-orange-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">Kết quả thanh toán</h1>
          <p className={`mt-4 text-base ${paid ? 'text-green-700' : 'text-gray-700'}`}>{message}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={goToTicketLookup}
              className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Xem chi tiết vé
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-full bg-[#ef5222] px-5 py-2 text-sm font-semibold text-white hover:bg-[#d84a1e]"
            >
              Về trang chủ
            </button>
          </div>
        </div>

        {paid && trackTripId ? <TripTrackingSection tripId={trackTripId} /> : null}
      </div>
    </div>
  );
};

export default PaymentResultPage;
