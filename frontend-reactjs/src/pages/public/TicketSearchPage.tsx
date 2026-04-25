import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../api/client';

type TicketSearchLocationState = {
  highlightedTicketCodes?: string[];
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

type ProfileResponse = {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
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

const TicketSearchPage = () => {
  const location = useLocation();
  const state = (location.state ?? {}) as TicketSearchLocationState;
  const highlightedCodes = useMemo(
    () => (state.highlightedTicketCodes ?? []).filter((c) => typeof c === 'string' && c.trim().length > 0),
    [state.highlightedTicketCodes],
  );
  const [phone, setPhone] = useState('');
  const [ticketCode, setTicketCode] = useState(highlightedCodes[0] ?? '');
  const [dangTraCuu, setDangTraCuu] = useState(false);
  const [ticketResult, setTicketResult] = useState<TicketLookup | null>(null);
  const [traCuuError, setTraCuuError] = useState('');

  const onSearchTicket = () => {
    void (async () => {
      const maVe = ticketCode.trim();
      const soDienThoai = phone.trim();
      if (!maVe || !soDienThoai) {
        setTraCuuError('Vui lòng nhập đầy đủ số điện thoại và mã vé để tra cứu.');
        setTicketResult(null);
        return;
      }
      setDangTraCuu(true);
      setTraCuuError('');
      try {
        const profileRes = await api.get<ApiResponse<ProfileResponse>>('/api/accounts/me/profile');
        const profile = profileRes.data?.data;
        const profilePhone = (profile?.phone ?? '').trim();
        if (!profilePhone || profilePhone !== soDienThoai) {
          setTicketResult(null);
          setTraCuuError('Số điện thoại không khớp với tài khoản đang đăng nhập.');
          return;
        }

        const ticketsRes = await api.get<ApiResponse<TicketLookup[]>>('/api/me/booking/tickets');
        const tickets = ticketsRes.data?.data ?? [];
        const found = tickets.find((t) => (t.maVe || '').toUpperCase() === maVe.toUpperCase());

        if (!found) {
          setTicketResult(null);
          setTraCuuError('Không tìm thấy vé phù hợp.');
          return;
        }
        const detailRes = await api.get<ApiResponse<TicketLookup>>(`/api/me/booking/tickets/${found.id}`);
        const detail = detailRes.data?.data ?? found;
        setTicketResult({
          ...detail,
          hoTenKhach: profile?.fullName ?? undefined,
          soDienThoaiKhach: profilePhone,
          emailKhach: profile?.email ?? undefined,
        });
      } catch (error) {
        const axiosErr = error as { response?: { data?: { message?: string } } };
        setTicketResult(null);
        setTraCuuError(axiosErr.response?.data?.message || 'Không thể tra cứu vé. Vui lòng kiểm tra đăng nhập và thử lại.');
      } finally {
        setDangTraCuu(false);
      }
    })();
  };

  return (
    <div className="min-h-[60vh] bg-gradient-to-b from-[#fff8f5] to-white py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#ef5222]">Tra cứu vé</p>
          <h2 className="mt-2 text-3xl font-bold text-[#00613d]">Tìm thông tin đặt vé nhanh chóng</h2>
          <p className="mt-3 text-gray-500">Nhập đúng số điện thoại và mã vé để xem thông tin chuyến đi của bạn.</p>
        </div>

        <div className="w-full rounded-3xl bg-white p-6 shadow-xl shadow-orange-100/60 ring-1 ring-[#ef5222]/10 md:p-8">
          {highlightedCodes.length > 0 && (
            <div className="mb-4 rounded-2xl border border-[#ef5222]/20 bg-[#fff7f3] p-4">
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
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Vui lòng nhập số điện thoại"
                className="w-full rounded-2xl border border-gray-200 bg-[#fdf8f5] px-4 py-4 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#ef5222] focus:bg-white focus:ring-2 focus:ring-[#ef5222]/15"
              />
            </div>
            <div className="relative">
              <input
                type="text"
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value)}
                placeholder="Vui lòng nhập mã vé"
                className={`w-full rounded-2xl border px-4 py-4 text-gray-800 outline-none transition placeholder:text-gray-400 focus:bg-white focus:ring-2 ${
                  highlightedCodes.includes(ticketCode)
                    ? 'border-[#ef5222] bg-[#fff7f3] focus:border-[#ef5222] focus:ring-[#ef5222]/20'
                    : 'border-gray-200 bg-[#fdf8f5] focus:border-[#ef5222] focus:ring-[#ef5222]/15'
                }`}
              />
            </div>
            <button
              type="button"
              onClick={onSearchTicket}
              disabled={dangTraCuu}
              className="w-full rounded-2xl bg-[#ef5222] py-4 font-semibold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-[#d84a1e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {dangTraCuu ? 'Đang tra cứu...' : 'Tra cứu'}
            </button>
          </div>
          {traCuuError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{traCuuError}</div>
          )}
          {ticketResult && (
            <div
              className={`mt-4 rounded-2xl border p-4 ${
                highlightedCodes.includes(ticketResult.maVe) ? 'border-[#ef5222] bg-[#fff7f3]' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">Mã vé:</p>
                <p className="font-mono text-sm font-bold text-[#ef5222]">{ticketResult.maVe}</p>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-gray-700">
                <p><span className="text-gray-500">Trạng thái:</span> <span className="font-semibold">{ticketResult.trangThai}</span></p>
                <p><span className="text-gray-500">Ngày đặt:</span> <span className="font-semibold">{formatInstant(ticketResult.ngayDat)}</span></p>
                <p><span className="text-gray-500">Khách hàng:</span> <span className="font-semibold">{ticketResult.hoTenKhach || '--'}</span></p>
                <p><span className="text-gray-500">SĐT:</span> <span className="font-semibold">{ticketResult.soDienThoaiKhach || '--'}</span></p>
                <p><span className="text-gray-500">Email:</span> <span className="font-semibold">{ticketResult.emailKhach || '--'}</span></p>
                <p><span className="text-gray-500">Tuyến:</span> <span className="font-semibold">{ticketResult.chuyen?.tenTuyen || `${ticketResult.chuyen?.diemDi || ''} - ${ticketResult.chuyen?.diemDen || ''}`}</span></p>
                <p><span className="text-gray-500">Khởi hành:</span> <span className="font-semibold">{formatDateTime(ticketResult.chuyen?.ngayDi, ticketResult.chuyen?.gioDi)}</span></p>
                <p><span className="text-gray-500">Đến dự kiến:</span> <span className="font-semibold">{formatDateTime(ticketResult.chuyen?.ngayDi, ticketResult.chuyen?.gioDenDuKien)}</span></p>
                <p><span className="text-gray-500">Loại xe:</span> <span className="font-semibold">{ticketResult.chuyen?.loaiXe || '--'}</span></p>
                <p><span className="text-gray-500">Biển số:</span> <span className="font-semibold">{ticketResult.chuyen?.bienSo || '--'}</span></p>
                <p><span className="text-gray-500">Ghế:</span> <span className="font-semibold">{ticketResult.maGhe?.join(', ') || '--'}</span></p>
                <p><span className="text-gray-500">Tổng tiền:</span> <span className="font-semibold text-[#00613d]">{formatCurrency(ticketResult.tongTien)}</span></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketSearchPage;