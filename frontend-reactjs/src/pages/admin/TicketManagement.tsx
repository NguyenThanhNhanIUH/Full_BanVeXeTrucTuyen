import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ticket,
  RefreshCw,
  Filter,
  Layers,
  Clock,
  CheckCircle2,
  Loader2,
  Ban,
  PartyPopper,
  Pencil,
  Trash2,
  Search,
} from 'lucide-react';
import { api } from '../../api/client';
import AdminPageStats from '../../components/admin/AdminPageStats';
import AdminListPagination, { ADMIN_PAGE_SIZE } from '../../components/admin/AdminListPagination';

const STATUSES = [
  'ALL',
  'CHO_THANH_TOAN',
  'DA_THANH_TOAN',
  'DANG_XU_LY',
  'DA_HUY',
  'HOAN_THANH',
] as const;

const STATUS_LABEL: Record<string, string> = {
  CHO_THANH_TOAN: 'Chờ thanh toán',
  DA_THANH_TOAN: 'Đã thanh toán',
  DANG_XU_LY: 'Đang xử lý',
  DA_HUY: 'Đã hủy',
  HOAN_THANH: 'Hoàn thành',
};

type TicketRow = {
  id: number;
  maVe: string;
  trangThai: string;
  tongTien: number | string;
  ngayDat: string;
  emailKhach?: string;
  hoTenKhach?: string;
  ghiChu?: string | null;
  tenTuyen?: string;
  ngayChuyen?: string;
  gioChuyen?: string | { hour?: number; minute?: number };
};

type PageData = {
  content: TicketRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

type TripOption = {
  id: number;
  tenTuyen?: string;
  diemDi?: string;
  diemDen?: string;
  ngayDi?: string;
  bienSo?: string;
};

type TicketDetail = {
  id: number;
  maVe: string;
  trangThai: string;
  tongTien: number | string;
  ngayDat: string;
  ghiChu?: string | null;
  khachHangId: number;
  emailKhach?: string;
  hoTenKhach?: string;
  maGhe: string[];
  chuyen: { id: number; tenTuyen?: string; giaVe?: number | string } | null;
};

function pickGhiChuFromRow(r: unknown): string | null {
  if (r == null || typeof r !== 'object') return null;
  const o = r as Record<string, unknown>;
  const g = o.ghiChu ?? o.ghi_chu;
  if (g == null) return null;
  const s = String(g);
  return s;
}

function formatInstant(s: string | undefined): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString('vi-VN');
  } catch {
    return s;
  }
}

function formatGio(g: TicketRow['gioChuyen']): string {
  if (g == null) return '';
  if (typeof g === 'string') {
    const m = g.match(/^(\d{1,2}):(\d{2})/);
    if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
    return g;
  }
  const h = g.hour ?? 0;
  const mi = g.minute ?? 0;
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}

function instantToLocalInput(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

function localInputToIso(local: string): string | null {
  if (!local.trim()) return null;
  const t = new Date(local).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(local).toISOString();
}

function parseGheList(text: string): string[] {
  return text
    .split(/[\s,;，]+/u)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

function apiErrMessage(err: unknown): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (err as { message?: string })?.message ||
    'Lỗi không xác định'
  );
}

const TicketManagement: React.FC = () => {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL');
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalId, setModalId] = useState<number | null>(null);
  const [detailLoad, setDetailLoad] = useState(false);
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [tripOptions, setTripOptions] = useState<TripOption[]>([]);
  const [form, setForm] = useState({
    maVe: '',
    khachHangId: '',
    chuyenXeId: '',
    trangThai: 'DANG_XU_LY' as string,
    ghiChu: '',
    ngayDatLocal: '',
    tongTienStr: '',
    maGheText: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [statsErr, setStatsErr] = useState<string | null>(null);
  const [ticketStats, setTicketStats] = useState({
    total: 0,
    choThanhToan: 0,
    daThanhToan: 0,
    dangXuLy: 0,
    daHuy: 0,
    hoanThanh: 0,
  });
  const [ticketSearch, setTicketSearch] = useState('');

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsErr(null);
    try {
      const { data: body } = await api.get('/api/manager/tickets/stats');
      const s = body?.data;
      if (s) {
        setTicketStats({
          total: Number(s.total) || 0,
          choThanhToan: Number(s.choThanhToan) || 0,
          daThanhToan: Number(s.daThanhToan) || 0,
          dangXuLy: Number(s.dangXuLy) || 0,
          daHuy: Number(s.daHuy) || 0,
          hoanThanh: Number(s.hoanThanh) || 0,
        });
      }
    } catch (e) {
      console.error(e);
      setStatsErr(apiErrMessage(e));
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const params: Record<string, string | number> = { page, size: ADMIN_PAGE_SIZE };
      if (status !== 'ALL') params.status = status;
      const { data: body } = await api.get('/api/manager/tickets', { params });
      const p = body?.data;
      if (p && Array.isArray(p.content)) {
        setData(p as PageData);
      } else {
        setData({ content: [], page: 0, size: ADMIN_PAGE_SIZE, totalElements: 0, totalPages: 0 });
      }
    } catch (e) {
      console.error(e);
      setData({ content: [], page: 0, size: ADMIN_PAGE_SIZE, totalElements: 0, totalPages: 0 });
      setLoadErr(apiErrMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const tp = data?.totalPages ?? 0;
    if (tp > 0 && page > tp - 1) setPage(tp - 1);
  }, [data?.totalPages, page]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const openEditModal = async (row: TicketRow) => {
    const id = row.id;
    setModalId(id);
    setModalErr(null);
    setDetailLoad(true);
    setTripOptions([]);
    try {
      const [td, tr] = await Promise.all([
        api.get(`/api/manager/tickets/${id}`),
        api.get('/api/manager/trips'),
      ]);
      const detail = (td.data as { data?: TicketDetail } | undefined)?.data;
      const rawTrips = (tr.data as { data?: TripOption[] } | undefined)?.data;
      if (!detail) {
        setModalErr('API không trả dữ liệu vé. Hãy build lại backend (manager tickets + ghi chú).');
        return;
      }
      setTripOptions(Array.isArray(rawTrips) ? rawTrips : []);
      const chId = detail.chuyen?.id;
      setForm({
        maVe: String(detail.maVe ?? ''),
        khachHangId: String(detail.khachHangId ?? ''),
        chuyenXeId: chId != null ? String(chId) : '',
        trangThai: detail.trangThai || 'DA_THANH_TOAN',
        ghiChu: detail.ghiChu != null && detail.ghiChu !== '' ? String(detail.ghiChu) : '',
        ngayDatLocal: instantToLocalInput(detail.ngayDat),
        tongTienStr: detail.tongTien != null && detail.tongTien !== '' ? String(detail.tongTien) : '',
        maGheText: Array.isArray(detail.maGhe) && detail.maGhe.length > 0 ? detail.maGhe.join(', ') : '',
      });
    } catch (e) {
      console.error(e);
      setModalErr(apiErrMessage(e));
    } finally {
      setDetailLoad(false);
    }
  };

  const closeModal = () => {
    setModalId(null);
    setModalErr(null);
    setForm({
      maVe: '',
      khachHangId: '',
      chuyenXeId: '',
      trangThai: 'DANG_XU_LY',
      ghiChu: '',
      ngayDatLocal: '',
      tongTienStr: '',
      maGheText: '',
    });
  };

  const onSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalId == null) return;
    setSaving(true);
    try {
      const kid = Number(form.khachHangId);
      const cid = Number(form.chuyenXeId);
      if (!Number.isInteger(kid) || kid < 1) {
        alert('Mã khách hàng (khachHangId) không hợp lệ.');
        return;
      }
      if (!Number.isInteger(cid) || cid < 1) {
        alert('Chọn chuyến xe hợp lệ.');
        return;
      }
      const maGhe = parseGheList(form.maGheText);
      if (maGhe.length < 1) {
        alert('Cần ít nhất một mã ghế (ví dụ: A01, A02), cách nhau bởi dấu phẩy hoặc xuống dòng.');
        return;
      }
      const payload: {
        maVe: string;
        khachHangId: number;
        chuyenXeId: number;
        maGhe: string[];
        trangThai: string;
        ghiChu: string;
        ngayDat: string | null;
        tongTien: number | null;
      } = {
        maVe: form.maVe.trim(),
        khachHangId: kid,
        chuyenXeId: cid,
        maGhe,
        trangThai: form.trangThai,
        ghiChu: form.ghiChu,
        ngayDat: localInputToIso(form.ngayDatLocal),
        tongTien: (() => {
          const t = form.tongTienStr.trim();
          if (t === '') return null;
          const n = Number(t);
          return Number.isFinite(n) ? n : null;
        })(),
      };
      if (payload.tongTien != null && (payload.tongTien < 0 || !Number.isFinite(payload.tongTien))) {
        alert('Tổng tiền không hợp lệ. Để trống để tự tính theo giá chuyến × số ghế.');
        return;
      }
      await api.put(`/api/manager/tickets/${modalId}`, payload);
      closeModal();
      await load();
      await loadStats();
    } catch (err: unknown) {
      alert(apiErrMessage(err) || 'Không thể lưu vé.');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteTicket = async () => {
    if (modalId == null) return;
    if (!window.confirm(`Xóa vĩnh viễn vé #${modalId} (${form.maVe})?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/api/manager/tickets/${modalId}`);
      closeModal();
      await load();
      await loadStats();
    } catch (err: unknown) {
      alert(apiErrMessage(err) || 'Không thể xóa vé.');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = data?.totalPages ?? 0;
  const total = data?.totalElements ?? 0;
  const list = data?.content ?? [];

  const displayTickets = useMemo(() => {
    const q = ticketSearch.trim().toLowerCase();
    const sorted = [...list].sort((a, b) => a.id - b.id);
    if (!q) return sorted;
    return sorted.filter((row) => {
      const gNote = pickGhiChuFromRow(row);
      const hay = [
        String(row.id),
        row.maVe,
        row.hoTenKhach,
        row.emailKhach,
        row.tenTuyen,
        row.ngayChuyen,
        formatGio(row.gioChuyen),
        row.trangThai,
        String(row.tongTien),
        gNote || '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [list, ticketSearch]);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2.5">
          <span className="w-1.5 h-6 bg-gradient-to-b from-[#ef5222] to-[#fd7e14] rounded-full inline-block" />
          Quản lý vé
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter size={16} />
            <span>Trạng thái</span>
            <select
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white"
              value={status}
              onChange={(e) => {
                setPage(0);
                setStatus(e.target.value as (typeof STATUSES)[number]);
              }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? 'Tất cả' : STATUS_LABEL[s] || s}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              void load();
              void loadStats();
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm hover:bg-gray-50"
          >
            <RefreshCw size={16} className={loading || statsLoading ? 'animate-spin' : ''} />
            Tải lại
          </button>
        </div>
      </div>

      <AdminPageStats
        title="Thống kê vé toàn hệ thống"
        loading={statsLoading}
        gridClassName="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-2"
        items={[
          { label: 'Tổng vé', value: ticketStats.total, icon: <Layers size={22} />, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
          { label: STATUS_LABEL.CHO_THANH_TOAN, value: ticketStats.choThanhToan, icon: <Clock size={22} />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: STATUS_LABEL.DA_THANH_TOAN, value: ticketStats.daThanhToan, icon: <CheckCircle2 size={22} />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: STATUS_LABEL.DANG_XU_LY, value: ticketStats.dangXuLy, icon: <Loader2 size={22} />, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200' },
          { label: STATUS_LABEL.DA_HUY, value: ticketStats.daHuy, icon: <Ban size={22} />, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
          { label: STATUS_LABEL.HOAN_THANH, value: ticketStats.hoanThanh, icon: <PartyPopper size={22} />, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50', border: 'border-fuchsia-200' },
        ]}
      />
      <p className="text-xs text-gray-500 -mt-2 mb-2">Bảng bên dưới: ghi chú lấy từ cột ghi chú (DB) qua API; sửa vé mở form đầy đủ, lưu bằng PUT.</p>

      {statsErr && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 mb-2">
          Thống kê vé: {statsErr} (bảng vẫn có thể tải riêng.)
        </div>
      )}
      {loadErr && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-2">
          <p className="font-semibold">Lỗi tải danh sách vé</p>
          <p className="mt-1">{loadErr}</p>
          <p className="mt-2 text-xs text-red-700">
            401/403: cần đăng nhập tài khoản QUAN_TRI. CSDL rỗng: chạy <code className="font-mono">database/data.sql</code> (bảng VeXe).
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-gray-100 bg-gray-50/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-600">
            Trang API <span className="font-semibold text-gray-800">{list.length > 0 ? page + 1 : 0}</span> /{' '}
            <span className="font-semibold text-gray-800">{totalPages || 0}</span> — khớp từ khóa trên trang này:{' '}
            <span className="font-semibold text-gray-800">{displayTickets.length}</span> / {list.length} dòng (tổng{' '}
            {total} vé
            {status !== 'ALL' ? `, lọc: ${status}` : ''})
          </p>
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              placeholder="Tìm ID, mã vé, khách, email, tuyến… (trang hiện tại)"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#ef5222] focus:ring-1 focus:ring-[#ef5222]/20"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-left text-gray-600">
              <tr>
                <th className="px-3 py-3 font-semibold">Mã vé</th>
                <th className="px-3 py-3 font-semibold">Khách</th>
                <th className="px-3 py-3 font-semibold">Tuyến / chuyến</th>
                <th className="px-3 py-3 font-semibold">Ghi chú (DB)</th>
                <th className="px-3 py-3 font-semibold">Tổng tiền</th>
                <th className="px-3 py-3 font-semibold">Đặt lúc</th>
                <th className="px-3 py-3 font-semibold">Trạng thái</th>
                <th className="px-3 py-3 font-semibold w-40">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Đang tải…
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Không có vé nào.
                  </td>
                </tr>
              ) : displayTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Không có vé khớp &quot;{ticketSearch}&quot; trên trang này.
                  </td>
                </tr>
              ) : (
                displayTickets.map((row) => {
                  const gNote = pickGhiChuFromRow(row);
                  return (
                    <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                      <td className="px-3 py-3 font-mono text-gray-900">{row.maVe}</td>
                      <td className="px-3 py-3">
                        <div className="text-gray-900">{row.hoTenKhach || '—'}</div>
                        <div className="text-xs text-gray-500">{row.emailKhach || ''}</div>
                      </td>
                      <td className="px-3 py-3 text-gray-800">
                        <div>{row.tenTuyen || '—'}</div>
                        <div className="text-xs text-gray-500">
                          {row.ngayChuyen || '—'}
                          {row.gioChuyen != null && ` ${formatGio(row.gioChuyen)}`}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-700 text-xs max-w-[200px]">
                        {gNote != null && gNote.trim() ? (
                          <span className="line-clamp-3" title={gNote}>
                            {gNote}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{String(row.tongTien)} đ</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {formatInstant(row.ngayDat)}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                          {STATUS_LABEL[row.trangThai] || row.trangThai}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => void openEditModal(row)}
                          className="inline-flex items-center gap-1 text-[#ef5222] hover:underline text-xs font-medium"
                          title="Sửa toàn bộ thông tin vé (từ CSDL)"
                        >
                          <Pencil size={12} />
                          Sửa
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <AdminListPagination page={page} total={total} pageSize={ADMIN_PAGE_SIZE} onPageChange={setPage} />
      </div>

      {modalId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
          <form
            onSubmit={onSaveTicket}
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-4 space-y-3 my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <Ticket className="text-[#ef5222]" size={20} />
              Sửa vé #{modalId} (dữ liệu từ CSDL)
            </div>
            {detailLoad && (
              <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">Đang tải chi tiết vé & danh sách chuyến…</p>
            )}
            {modalErr && (
              <p className="text-sm text-red-800 bg-red-50 rounded-lg px-3 py-2">
                {modalErr} — cần backend mới (PUT/GET vé, bảng VeXe.ghi_chu).
              </p>
            )}

            <div>
              <label className="text-sm text-gray-700">Mã vé</label>
              <input
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                value={form.maVe}
                onChange={(e) => setForm((f) => ({ ...f, maVe: e.target.value }))}
                required
                disabled={detailLoad}
              />
            </div>
            <div>
              <label className="text-sm text-gray-700">ID khách hàng (khach_hang_id)</label>
              <input
                type="number"
                min={1}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.khachHangId}
                onChange={(e) => setForm((f) => ({ ...f, khachHangId: e.target.value }))}
                required
                disabled={detailLoad}
              />
            </div>
            <div>
              <label className="text-sm text-gray-700">Chuyến xe</label>
              <select
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.chuyenXeId}
                onChange={(e) => setForm((f) => ({ ...f, chuyenXeId: e.target.value }))}
                required
                disabled={detailLoad}
              >
                <option value="">— Chọn chuyến —</option>
                {tripOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.id} {t.tenTuyen || ''} — {t.ngayDi || ''} ({t.bienSo || 'xe?'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-700">Mã ghế (cách nhau bởi dấu phẩy, khoảng trắng; ví dụ A01, A02)</label>
              <textarea
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[72px] font-mono"
                value={form.maGheText}
                onChange={(e) => setForm((f) => ({ ...f, maGheText: e.target.value }))}
                placeholder="A01, A02"
                required
                disabled={detailLoad}
              />
            </div>
            <div>
              <label className="text-sm text-gray-700">Trạng thái vé</label>
              <select
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.trangThai}
                onChange={(e) => setForm((f) => ({ ...f, trangThai: e.target.value }))}
                required
                disabled={detailLoad}
              >
                {STATUSES.filter((s) => s !== 'ALL').map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s] || s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-700">Ghi chú (VeXe.ghi_chu)</label>
              <textarea
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[72px]"
                value={form.ghiChu}
                onChange={(e) => setForm((f) => ({ ...f, ghiChu: e.target.value }))}
                disabled={detailLoad}
              />
            </div>
            <div>
              <label className="text-sm text-gray-700">Ngày đặt (local)</label>
              <input
                type="datetime-local"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.ngayDatLocal}
                onChange={(e) => setForm((f) => ({ ...f, ngayDatLocal: e.target.value }))}
                disabled={detailLoad}
              />
            </div>
            <div>
              <label className="text-sm text-gray-700">Tổng tiền (VNĐ, để trống = tự tính: giá chuyến × số ghế)</label>
              <input
                type="number"
                min={0}
                step={1000}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.tongTienStr}
                onChange={(e) => setForm((f) => ({ ...f, tongTienStr: e.target.value }))}
                disabled={detailLoad}
              />
            </div>

            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => void onDeleteTicket()}
                disabled={detailLoad || saving || deleting}
                className="px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 size={16} />
                {deleting ? 'Đang xóa…' : 'Xóa vé'}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={detailLoad || saving || deleting}
                  className="px-4 py-2 rounded-lg bg-[#ef5222] text-white text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Đang lưu…' : 'Lưu (PUT)'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TicketManagement;
