import React, { useCallback, useEffect, useState } from 'react';
import { Ban, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import { REALTIME_POLL_MS } from '../../constants/realtimePoll';
import { usePollingRefresh } from '../../hooks/usePollingRefresh';

type TripSummary = {
  tenTuyen?: string;
  diemDi?: string;
  diemDen?: string;
  ngayDi?: string;
  gioDi?: string;
};

type Item = {
  id: number;
  maVe: string;
  trangThai: string;
  tongTien: number;
  ngayDat?: string;
  ghiChu?: string | null;
  emailKhach?: string;
  hoTenKhach?: string;
  soDienThoaiKhach?: string;
  maGhe?: string[];
  chuyen?: TripSummary | null;
};

const formatMoney = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

const CancelRequestsPage: React.FC = () => {
  const [list, setList] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [lyDo, setLyDo] = useState('');

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (!silent) {
      setLoading(true);
    }
    setErr('');
    try {
      const { data: countWrap } = await api.get<{ data?: number }>(
        '/api/staff/booking/cancel-requests/pending-count'
      );
      const pending = countWrap?.data ?? 0;
      if (pending === 0) {
        setList([]);
        return;
      }
      const { data: body } = await api.get<{ data?: Item[] }>('/api/staff/booking/cancel-requests');
      setList(body?.data ?? []);
    } catch (e) {
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (!silent) {
        setErr(m || 'Không tải được danh sách yêu cầu hủy.');
      }
      setList([]);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  usePollingRefresh(load, REALTIME_POLL_MS);

  const approve = async (id: number) => {
    if (!window.confirm('Duyệt hủy vé này? Vé sẽ chuyển sang trạng thái Đã hủy.')) return;
    setBusyId(id);
    try {
      await api.post(`/api/staff/booking/tickets/${id}/approve-cancel`);
      window.alert('Đã duyệt hủy vé.');
      await load();
    } catch (e) {
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      window.alert(m || 'Thao tác thất bại.');
    } finally {
      setBusyId(null);
    }
  };

  const openReject = (id: number) => {
    setRejectId(id);
    setLyDo('');
  };

  const doReject = async () => {
    if (rejectId == null) return;
    if (!lyDo.trim()) {
      window.alert('Vui lòng nhập lý do từ chối.');
      return;
    }
    setBusyId(rejectId);
    try {
      await api.post(`/api/staff/booking/tickets/${rejectId}/reject-cancel`, { lyDo: lyDo.trim() });
      setRejectId(null);
      window.alert('Đã từ chối yêu cầu. Khách hàng được thông báo qua hệ thống (ghi chú vé).');
      await load();
    } catch (e) {
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      window.alert(m || 'Thao tác thất bại.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2.5">
          <span className="w-1.5 h-6 bg-gradient-to-b from-[#ef5222] to-[#fd7e14] rounded-full inline-block" />
          Yêu cầu hủy vé
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      <p className="text-sm text-gray-600">
        Danh sách vé ở trạng thái &quot;Đang xử lý&quot; (khách đã gửi yêu cầu hủy). Cột ghi chú ở đây phản ánh
        ghi chú lúc còn chờ duyệt; sau <strong>duyệt hủy</strong> dòng sẽ biến mất (vé đã hủy) — mở mục{" "}
        <strong>Vé</strong>, bộ lọc <strong>Đã hủy</strong> hoặc <strong>Tất cả</strong> để xem ghi chú mới
        (dạng <span className="whitespace-nowrap">Hủy vé thành công: … — …</span>).
      </p>

      {err && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">{err}</div>}

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
        </div>
      )}

      {!loading && list.length === 0 && <p className="text-sm text-gray-500">Không có yêu cầu hủy đang chờ.</p>}

      {!loading && list.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Mã vé / Khách</th>
                <th className="px-4 py-3 font-semibold">Tuyến</th>
                <th className="px-4 py-3 font-semibold">Tiền</th>
                <th className="px-4 py-3 font-semibold">Ghi chú</th>
                <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{row.maVe}</div>
                    <div className="text-xs text-gray-500">#{row.id}</div>
                    <div className="text-xs text-gray-600 mt-1">{row.hoTenKhach || '—'}</div>
                    <div className="text-xs text-gray-500">{row.emailKhach || row.soDienThoaiKhach || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    {row.chuyen?.tenTuyen || `${row.chuyen?.diemDi || ''} → ${row.chuyen?.diemDen || ''}`}
                    <div className="text-xs text-gray-500 mt-0.5">Ghế: {(row.maGhe || []).join(', ') || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-[#00613d] font-medium">{formatMoney(row.tongTien)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate" title={row.ghiChu || ''}>
                    {row.ghiChu || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => void approve(row.id)}
                        disabled={busyId != null}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} />
                        Duyệt hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => openReject(row.id)}
                        disabled={busyId != null}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        <Ban size={14} />
                        Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rejectId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold text-gray-900">Từ chối yêu cầu hủy vé</h3>
            <p className="mt-1 text-sm text-gray-500">Nhập lý do từ chối (lưu trong ghi chú vé, khách có thể xem tại lịch sử vé).</p>
            <textarea
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[100px]"
              value={lyDo}
              onChange={(e) => setLyDo(e.target.value)}
              placeholder="Lý do từ chối…"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setRejectId(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">
                Đóng
              </button>
              <button
                type="button"
                onClick={() => void doReject()}
                disabled={busyId != null}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CancelRequestsPage;
