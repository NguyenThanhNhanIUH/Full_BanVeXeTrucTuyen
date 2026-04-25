import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../../api/client';
import { getStoredRole, getToken } from '../../auth/storage';
import CustomerAccountShell from '../../components/account/CustomerAccountShell';

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

type TripSummary = {
  tenTuyen?: string;
  diemDi?: string;
  diemDen?: string;
  ngayDi?: string;
  gioDi?: string;
};

type TicketItem = {
  id: number;
  maVe: string;
  trangThai: string;
  tongTien: number;
  ngayDat?: string;
  maGhe?: string[];
  chuyen?: TripSummary;
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

const CustomerTicketHistoryPage = () => {
  const role = getStoredRole();
  const token = getToken();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const loadTickets = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get<ApiResponse<TicketItem[]>>('/api/me/booking/tickets');
        const list = res.data?.data ?? [];
        setTickets(
          list.slice().sort((a, b) => {
            const ta = a.ngayDat ? new Date(a.ngayDat).getTime() : 0;
            const tb = b.ngayDat ? new Date(b.ngayDat).getTime() : 0;
            return tb - ta;
          }),
        );
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || 'Không thể tải lịch sử mua vé.');
      } finally {
        setLoading(false);
      }
    };
    void loadTickets();
  }, []);

  if (!token || role !== 'KHACH_HANG') {
    return <Navigate to="/login" replace />;
  }

  const filteredTickets = tickets.filter((ticket) => {
    const matchKeyword = keyword.trim()
      ? ticket.maVe.toLowerCase().includes(keyword.trim().toLowerCase())
      : true;
    const matchStatus = statusFilter ? ticket.trangThai === statusFilter : true;
    return matchKeyword && matchStatus;
  });

  const statuses = Array.from(new Set(tickets.map((t) => t.trangThai).filter(Boolean)));

  return (
    <CustomerAccountShell
      active="history"
      title="Lịch sử mua vé"
      subtitle="Theo dõi và quản lý quá trình lịch sử mua vé của bạn"
      rightAction={
        <Link to="/" className="rounded-full bg-[#ef5222] px-10 py-2.5 text-base font-semibold text-white hover:bg-[#d84a1e]">
          Đặt vé
        </Link>
      }
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Nhập mã vé"
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#ef5222]"
          />
          <input
            type="date"
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#ef5222]"
          />
          <input
            placeholder="Tuyến đường"
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#ef5222]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#ef5222]"
          >
            <option value="">Trạng thái</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

          {loading && <p className="text-sm text-gray-500">Đang tải lịch sử mua vé...</p>}
          {!loading && error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {!loading && !error && filteredTickets.length === 0 && (
            <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">Bạn chưa có vé nào.</p>
          )}

          {!loading && !error && filteredTickets.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#faf7f5] text-left text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Mã vé</th>
                      <th className="px-4 py-3 font-semibold">Số vé</th>
                      <th className="px-4 py-3 font-semibold">Tuyến đường</th>
                      <th className="px-4 py-3 font-semibold">Ngày đi</th>
                      <th className="px-4 py-3 font-semibold">Số tiền</th>
                      <th className="px-4 py-3 font-semibold">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-semibold text-gray-800">{ticket.maVe}</td>
                        <td className="px-4 py-3">{ticket.maGhe?.length ?? 1}</td>
                        <td className="px-4 py-3">{ticket.chuyen?.tenTuyen || `${ticket.chuyen?.diemDi || ''} - ${ticket.chuyen?.diemDen || ''}`}</td>
                        <td className="px-4 py-3">{formatDateTime(ticket.chuyen?.ngayDi, ticket.chuyen?.gioDi)}</td>
                        <td className="px-4 py-3 font-semibold text-[#00613d]">{formatCurrency(ticket.tongTien)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[#fff0ea] px-2.5 py-1 text-xs font-semibold text-[#ef5222]">{ticket.trangThai}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">Cập nhật gần nhất: {formatInstant(filteredTickets[0]?.ngayDat)}</p>
            </div>
          )}
      </div>
    </CustomerAccountShell>
  );
};

export default CustomerTicketHistoryPage;
