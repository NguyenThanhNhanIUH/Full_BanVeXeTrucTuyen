import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { getStoredEmail, getStoredName, getStoredPhone, getStoredRole, getToken } from '../../auth/storage';
import CustomerAccountShell from '../../components/account/CustomerAccountShell';

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

type TripSummary = {
  id?: number;
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
  holdExpiresAt?: string;
  maGhe?: string[];
  ghiChu?: string;
  chuyen?: TripSummary;
};

const isPendingPayment = (status: string) => status === 'CHO_THANH_TOAN' || status === 'DAT_TRUOC';

const formatStatusLabel = (status: string) => {
  if (status === 'DAT_TRUOC') return 'Đặt trước';
  if (status === 'CHO_THANH_TOAN') return 'Chờ TT';
  return status;
};

/** Từ chối hủy: bản cũ có ngoặc, bản mới một dòng "Từ chối hủy: lý do — thời gian". */
function parseCancelRejection(ghiChu?: string): string | null {
  if (!ghiChu) return null;
  const leg = ghiChu.match(/\[Từ chối hủy:\s*([^\]]*)\]/);
  if (leg) {
    const s = leg[1].trim();
    return s.length > 0 ? s : 'Không nêu lý do';
  }
  const k = ghiChu.lastIndexOf('Từ chối hủy:');
  if (k < 0) return null;
  const rest = ghiChu.slice(k + 'Từ chối hủy:'.length).trim();
  if (rest.length === 0) return 'Không nêu lý do';
  return rest.replace(/\s*—\s*\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s*$/u, '').trim() || rest;
}

/** Vé đã kết thúc (đã hủy / hoàn thành): không hiển thị “từ chối hủy” cũ còn lưu trong ghi chú. */
function shouldShowStaffRejectNote(trangThai: string, reason: string | null): boolean {
  if (!reason) return false;
  if (trangThai === 'DA_HUY' || trangThai === 'HOAN_THANH') return false;
  return true;
}

/** Phần sau {@code Hủy vé thành công: } (bản cũ có ngoặc […] vẫn parse được). */
function parseHuySuccessFromGhiChu(ghiChu?: string): string | null {
  if (!ghiChu) return null;
  const leg = ghiChu.match(/\[Hủy vé thành công:\s*([^\]]+)\]/);
  if (leg) return leg[1].trim();
  const marker = 'Hủy vé thành công:';
  const k = ghiChu.lastIndexOf(marker);
  if (k >= 0) return ghiChu.slice(k + marker.length).trim();
  return null;
}

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
  const navigate = useNavigate();
  const location = useLocation();
  const deferredSuccess = Boolean((location.state as { deferredSuccess?: boolean } | null)?.deferredSuccess);
  const role = getStoredRole();
  const token = getToken();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  /** Thông báo tạm tại cột Thông báo (yêu cầu hủy gửi đi, hoặc lỗi) */
  const [ticketInlineMsg, setTicketInlineMsg] = useState<
    Record<number, { text: string; kind: 'success' | 'error' | 'warn' }>
  >({});

  const retryPayment = (ticket: TicketItem) => {
    if (!isPendingPayment(ticket.trangThai) || !ticket.chuyen?.id) return;
    navigate('/thanh-toan', {
      state: {
        tripType: 'one-way',
        customer: {
          fullName: getStoredName() || '',
          phone: getStoredPhone() || '',
          email: getStoredEmail() || '',
        },
        createdTickets: [
          {
            id: ticket.id,
            maVe: ticket.maVe,
            trangThai: ticket.trangThai,
          },
        ],
        outboundTrip: {
          id: ticket.chuyen.id,
          tenTuyen: ticket.chuyen.tenTuyen || '',
          diemDi: ticket.chuyen.diemDi || '',
          diemDen: ticket.chuyen.diemDen || '',
          ngayDi: ticket.chuyen.ngayDi || '',
          gioDi: ticket.chuyen.gioDi || '',
          giaVe: Number(ticket.tongTien || 0),
        },
        selectedOutboundSeats: ticket.maGhe || [],
        totalOutbound: Number(ticket.tongTien || 0),
        totalAmount: Number(ticket.tongTien || 0),
      },
    });
  };

  const canRequestCancel = (t: TicketItem) => {
    if (t.trangThai === 'DANG_XU_LY') return false;
    if (isPendingPayment(t.trangThai)) return true;
    if (t.trangThai !== 'DA_THANH_TOAN') return false;
    if (t.ngayDat) {
      const h = (nowMs - new Date(t.ngayDat).getTime()) / 3600000;
      if (h >= 12) return false;
    }
    if (t.chuyen?.ngayDi && t.chuyen?.gioDi) {
      const gio = typeof t.chuyen.gioDi === 'string' ? t.chuyen.gioDi : '';
      const dep = new Date(`${t.chuyen.ngayDi}T${gio.length >= 5 ? gio.slice(0, 5) : gio}:00`);
      if (!Number.isNaN(dep.getTime()) && dep.getTime() - nowMs < 12 * 3600000) return false;
    }
    return true;
  };

  const requestCancel = async (ticket: TicketItem) => {
    if (!canRequestCancel(ticket)) {
      setTicketInlineMsg((prev) => ({
        ...prev,
        [ticket.id]: {
          kind: 'error',
          text: 'Vé này không thể hủy: kiểm tra thời gian đặt, giờ khởi hành hoặc trạng thái.',
        },
      }));
      return;
    }
    const msg =
      isPendingPayment(ticket.trangThai)
        ? ticket.trangThai === 'DAT_TRUOC'
          ? 'Xác nhận hủy vé đặt trước?'
          : 'Xác nhận hủy vé chờ thanh toán?'
        : 'Gửi yêu cầu hủy vé? Nhân viên sẽ duyệt.';
    if (!window.confirm(msg)) return;
    setRequestingId(ticket.id);
    setTicketInlineMsg((prev) => {
      const next = { ...prev };
      delete next[ticket.id];
      return next;
    });
    try {
      const res = await api.post<ApiResponse<unknown>>(`/api/me/booking/tickets/${ticket.id}/cancel`);
      const m =
        res.data?.message ||
        (ticket.trangThai === 'CHO_THANH_TOAN' ? 'Hủy vé thành công' : 'Đã gửi yêu cầu hủy vé.');
      const r = await api.get<ApiResponse<TicketItem[]>>('/api/me/booking/tickets');
      const list = (r.data?.data ?? []).slice().sort((a, b) => {
        const ta = a.ngayDat ? new Date(a.ngayDat).getTime() : 0;
        const tb = b.ngayDat ? new Date(b.ngayDat).getTime() : 0;
        return tb - ta;
      });
      setTickets(list);
      const upd = list.find((t) => t.id === ticket.id);
      const ghiLuuHuy = upd?.trangThai === 'DA_HUY' && parseHuySuccessFromGhiChu(upd.ghiChu);
      if (upd?.trangThai === 'DANG_XU_LY' || (upd?.trangThai === 'DA_HUY' && !ghiLuuHuy)) {
        setTicketInlineMsg((prev) => ({ ...prev, [ticket.id]: { kind: 'success', text: m } }));
        window.setTimeout(() => {
          setTicketInlineMsg((prev) => {
            if (prev[ticket.id]?.kind !== 'success') return prev;
            const next = { ...prev };
            delete next[ticket.id];
            return next;
          });
        }, 8000);
      }
    } catch (e) {
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setTicketInlineMsg((prev) => ({
        ...prev,
        [ticket.id]: { kind: 'error', text: m || 'Hủy vé không thành công.' },
      }));
    } finally {
      setRequestingId(null);
    }
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(intervalId);
  }, []);

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
      {deferredSuccess && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Đặt trước thành công! Ghế đã được giữ. Hệ thống sẽ nhắc bạn qua email và thông báo tài khoản trước hạn thanh toán.
        </div>
      )}
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
                      <th className="min-w-[200px] px-4 py-3 font-semibold">Thông báo</th>
                      <th className="px-4 py-3 font-semibold">Hủy vé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((ticket) => {
                      const rawReject = parseCancelRejection(ticket.ghiChu);
                      const rejectReason =
                        rawReject && shouldShowStaffRejectNote(ticket.trangThai, rawReject) ? rawReject : null;
                      const huyGhiChu = parseHuySuccessFromGhiChu(ticket.ghiChu);
                      const huyTrenDb = ticket.trangThai === 'DA_HUY' && huyGhiChu;
                      const line = ticketInlineMsg[ticket.id];
                      const showLineTinhNhat = Boolean(
                        line &&
                        (line.kind === 'error' ||
                          line.kind === 'warn' ||
                          (line.kind === 'success' &&
                            (ticket.trangThai === 'DANG_XU_LY' || (ticket.trangThai === 'DA_HUY' && !huyTrenDb)))),
                      );
                      return (
                        <tr key={ticket.id} className="border-t border-gray-100">
                          <td className="px-4 py-3 font-semibold text-gray-800">{ticket.maVe}</td>
                          <td className="px-4 py-3">{ticket.maGhe?.length ?? 1}</td>
                          <td className="px-4 py-3">
                            {ticket.chuyen?.tenTuyen || `${ticket.chuyen?.diemDi || ''} - ${ticket.chuyen?.diemDen || ''}`}
                          </td>
                          <td className="px-4 py-3">{formatDateTime(ticket.chuyen?.ngayDi, ticket.chuyen?.gioDi)}</td>
                          <td className="px-4 py-3 font-semibold text-[#00613d]">{formatCurrency(ticket.tongTien)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className="rounded-full bg-[#fff0ea] px-2.5 py-1 text-xs font-semibold text-[#ef5222] w-fit">
                                {formatStatusLabel(ticket.trangThai)}
                              </span>
                              {ticket.trangThai === 'DAT_TRUOC' && ticket.holdExpiresAt && (
                                <span className="text-[11px] text-gray-500">
                                  Hạn TT: {formatInstant(ticket.holdExpiresAt)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex min-w-0 max-w-xs flex-col gap-1.5">
                              {huyTrenDb && (
                                <p
                                  className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] leading-snug text-emerald-900"
                                  role="status"
                                >
                                  <span className="font-semibold">Hủy thành công. </span>
                                  {huyGhiChu}
                                </p>
                              )}
                              {rejectReason && (
                                <p
                                  className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-900"
                                  role="status"
                                >
                                  <span className="font-semibold">Từ chối hủy: </span>
                                  {rejectReason}
                                </p>
                              )}
                              {showLineTinhNhat && line && (
                                <p
                                  className={`rounded-md border px-2 py-1.5 text-[11px] leading-snug ${
                                    line.kind === 'success'
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                      : line.kind === 'warn'
                                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                                        : 'border-red-200 bg-red-50 text-red-800'
                                  }`}
                                  role="status"
                                >
                                  {line.text}
                                </p>
                              )}
                              {!huyTrenDb && !rejectReason && !showLineTinhNhat && (
                                <span className="text-xs text-gray-300">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col gap-2">
                              {isPendingPayment(ticket.trangThai) && (
                                <button
                                  type="button"
                                  onClick={() => retryPayment(ticket)}
                                  className="rounded-lg border border-[#ef5222] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#ef5222] hover:bg-[#fff0ea]"
                                >
                                  {ticket.trangThai === 'DAT_TRUOC' ? 'Thanh toán ngay' : 'Thanh toán lại'}
                                </button>
                              )}
                              {canRequestCancel(ticket) && (
                                <button
                                  type="button"
                                  disabled={requestingId === ticket.id}
                                  onClick={() => void requestCancel(ticket)}
                                  className="rounded-lg border border-[#ef5222] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#ef5222] hover:bg-[#fff0ea] disabled:opacity-50"
                                >
                                  {requestingId === ticket.id
                                    ? '…'
                                    : isPendingPayment(ticket.trangThai)
                                      ? 'Hủy vé'
                                      : 'Yêu cầu hủy vé'}
                                </button>
                              )}
                              {!isPendingPayment(ticket.trangThai) && !canRequestCancel(ticket) && (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
