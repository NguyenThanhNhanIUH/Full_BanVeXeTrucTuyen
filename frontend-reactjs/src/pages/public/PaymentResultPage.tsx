import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';

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
};

const PAYMENT_STATE_STORAGE_KEY = 'banvexe_payment_state';

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Đang xác nhận giao dịch với PayOS...');
  const [paid, setPaid] = useState(false);

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
          setMessage('Thanh toán thành công. Đang chuyển đến trang tra cứu vé...');
          // Try to prefill ticket code(s) from URL first, then fallback to sessionStorage.
          let highlightedTicketCodes = (searchParams.get('ticketCodes') ?? '')
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v.length > 0);
          try {
            if (highlightedTicketCodes.length === 0) {
              const raw = sessionStorage.getItem(PAYMENT_STATE_STORAGE_KEY);
              if (raw) {
                const st = JSON.parse(raw) as PaymentState;
                highlightedTicketCodes = (st.createdTickets ?? [])
                  .map((t) => (t?.maVe ?? '').trim())
                  .filter((v) => v.length > 0);
              }
            }
          } catch {
            // ignore storage parse errors
          }

          // Clear cached payment state to avoid reusing stale tickets later.
          try {
            sessionStorage.removeItem(PAYMENT_STATE_STORAGE_KEY);
          } catch {
            // ignore
          }

          setTimeout(
            () =>
              navigate('/tra-cuu-ve', {
                state: highlightedTicketCodes.length > 0 ? { highlightedTicketCodes } : undefined,
              }),
            1500
          );
          return;
        }
        setMessage(`Thanh toán chưa thành công (trạng thái: ${data?.data?.paymentStatus || 'UNKNOWN'}).`);
      } catch (error) {
        const axiosErr = error as { response?: { data?: { message?: string } } };
        setMessage(axiosErr.response?.data?.message || 'Không thể xác nhận thanh toán.');
      }
    })();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-[65vh] bg-[#f3f3f5] px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-2xl border border-orange-100 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Kết quả thanh toán</h1>
        <p className={`mt-4 text-base ${paid ? 'text-green-700' : 'text-gray-700'}`}>{message}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/tra-cuu-ve')}
            className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Tra cứu vé
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
    </div>
  );
};

export default PaymentResultPage;
