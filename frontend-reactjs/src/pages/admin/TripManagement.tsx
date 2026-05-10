import React, { useEffect, useMemo, useState } from 'react';
import AdminListPagination, { ADMIN_PAGE_SIZE } from '../../components/admin/AdminListPagination';
import { Plus, Pencil, Trash2, RefreshCw, BusFront, Timer, Play, Flag, OctagonX, Search } from 'lucide-react';
import { api } from '../../api/client';
import AdminPageStats from '../../components/admin/AdminPageStats';
import { getStoredRole } from '../../auth/storage';
import type { RouteOpt, TripFormState, TripRow, VehicleOpt } from './tripManagementTypes';
import { formatTimeForInput, toLocalTimeString, TRIP_STATUS_OPTIONS } from './tripManagementShared';
import TripFormModal from './TripFormModal';

const TripManagement: React.FC = () => {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [routes, setRoutes] = useState<RouteOpt[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TripFormState>({
    tuyenXeId: '',
    xeId: '',
    ngayDi: '',
    gioDi: '06:00',
    giaVe: '',
    trangThai: 'CHUA_KHOI_HANH',
  });
  const [saving, setSaving] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [tripSearch, setTripSearch] = useState('');
  const [tripStatusFilter, setTripStatusFilter] = useState<
    'ALL' | 'CHUA_KHOI_HANH' | 'DANG_CHAY' | 'HOAN_THANH' | 'HUY_CHUYEN'
  >('ALL');
  const [tablePage, setTablePage] = useState(0);
  const isStaff = getStoredRole() === 'NHAN_VIEN';
  const [savingStatusId, setSavingStatusId] = useState<number | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setLoadErr(null);
    const labels = [
      { key: 'trips', path: 'Chuyến (GET /api/manager/trips)' },
      { key: 'routes', path: 'Tuyến (GET /api/manager/routes)' },
      { key: 'vehicles', path: 'Xe (GET /api/manager/vehicles)' },
    ] as const;
    try {
      const results = await Promise.allSettled([
        api.get('/api/manager/trips'),
        api.get('/api/manager/routes'),
        api.get('/api/manager/vehicles'),
      ]);
      const errParts: string[] = [];
      const tr = results[0];
      if (tr.status === 'fulfilled') {
        const tRaw = (tr.value.data as { data?: unknown } | undefined)?.data;
        setTrips(Array.isArray(tRaw) ? tRaw : []);
      } else {
        setTrips([]);
        const msg =
          (tr.reason as { response?: { data?: { message?: string }; status?: number } })?.response?.data
            ?.message || (tr.reason as { message?: string })?.message || String(tr.reason);
        errParts.push(`${labels[0].path}: ${msg}`);
      }
      const rt = results[1];
      if (rt.status === 'fulfilled') {
        const rRaw = (rt.value.data as { data?: unknown } | undefined)?.data;
        setRoutes(Array.isArray(rRaw) ? rRaw : []);
      } else {
        setRoutes([]);
        const msg =
          (rt.reason as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (rt.reason as { message?: string })?.message ||
          String(rt.reason);
        errParts.push(`${labels[1].path}: ${msg}`);
      }
      const vh = results[2];
      if (vh.status === 'fulfilled') {
        const vRaw = (vh.value.data as { data?: unknown } | undefined)?.data;
        setVehicles(Array.isArray(vRaw) ? vRaw : []);
      } else {
        setVehicles([]);
        const msg =
          (vh.reason as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (vh.reason as { message?: string })?.message ||
          String(vh.reason);
        errParts.push(`${labels[2].path}: ${msg}`);
      }
      if (errParts.length) {
        setLoadErr(errParts.join(' | '));
      }
    } catch (e: unknown) {
      console.error(e);
      setTrips([]);
      setRoutes([]);
      setVehicles([]);
      setLoadErr(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (e as { message?: string })?.message ||
          'Không tải được dữ liệu (mạng, backend 8080, hoặc chưa đăng nhập quản trị / JWT hết hạn).',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const tripStats = useMemo(() => {
    const c = { CHUA_KHOI_HANH: 0, DANG_CHAY: 0, HOAN_THANH: 0, HUY_CHUYEN: 0 };
    for (const t of trips) {
      const k = t.trangThaiChuyen as keyof typeof c;
      if (k in c) c[k] += 1;
    }
    return { total: trips.length, ...c };
  }, [trips]);

  const displayTrips = useMemo(() => {
    const q = tripSearch.trim().toLowerCase();
    let base = trips;
    if (tripStatusFilter !== 'ALL') {
      base = trips.filter((t) => t.trangThaiChuyen === tripStatusFilter);
    }
    const sorted = [...base].sort((a, b) => a.id - b.id);
    if (!q) return sorted;
    return sorted.filter((t) => {
      const hay = [
        String(t.id),
        t.tenTuyen,
        t.diemDi,
        t.diemDen,
        t.ngayDi,
        formatTimeForInput(t.gioDi),
        t.bienSo,
        t.loaiXe,
        String(t.giaVe),
        String(t.tuyenXeId),
        String(t.xeId),
        t.trangThaiChuyen,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [trips, tripSearch, tripStatusFilter]);

  useEffect(() => {
    setTablePage(0);
  }, [tripSearch, tripStatusFilter]);

  const tripTotalPages = displayTrips.length === 0 ? 0 : Math.max(1, Math.ceil(displayTrips.length / ADMIN_PAGE_SIZE));

  useEffect(() => {
    const maxP = Math.max(0, tripTotalPages - 1);
    if (tablePage > maxP) setTablePage(maxP);
  }, [tripTotalPages, tablePage]);

  const pageRows = useMemo(() => {
    const start = tablePage * ADMIN_PAGE_SIZE;
    return displayTrips.slice(start, start + ADMIN_PAGE_SIZE);
  }, [displayTrips, tablePage]);

  const openAdd = () => {
    setEditingId(null);
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      tuyenXeId: routes[0]?.id != null ? String(routes[0].id) : '',
      xeId: vehicles[0]?.id != null ? String(vehicles[0].id) : '',
      ngayDi: today,
      gioDi: '06:00',
      giaVe: '',
      trangThai: 'CHUA_KHOI_HANH',
    });
    setModal('add');
  };

  const openEdit = (t: TripRow) => {
    setEditingId(t.id);
    setForm({
      tuyenXeId: String(t.tuyenXeId),
      xeId: String(t.xeId),
      ngayDi: t.ngayDi,
      gioDi: formatTimeForInput(t.gioDi),
      giaVe: String(t.giaVe),
      trangThai: (t.trangThaiChuyen as TripFormState['trangThai']) || 'CHUA_KHOI_HANH',
    });
    setModal('edit');
  };

  const closeModal = () => {
    setModal(null);
    setEditingId(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const gia = Number(form.giaVe);
      if (Number.isNaN(gia) || gia <= 0) {
        alert('Giá vé phải là số dương.');
        return;
      }
      const tid = Number(form.tuyenXeId);
      const vid = Number(form.xeId);
      if (!tid || !vid) {
        alert('Chọn tuyến và xe.');
        return;
      }
      const body =
        modal === 'add'
          ? {
              tuyenXeId: tid,
              xeId: vid,
              ngayDi: form.ngayDi,
              gioDi: toLocalTimeString(form.gioDi),
              giaVe: gia,
            }
          : {
              tuyenXeId: tid,
              xeId: vid,
              ngayDi: form.ngayDi,
              gioDi: toLocalTimeString(form.gioDi),
              giaVe: gia,
              trangThai: form.trangThai,
            };
      if (modal === 'add') {
        await api.post('/api/manager/trips', body);
      } else if (editingId != null) {
        await api.put(`/api/manager/trips/${editingId}`, body);
      }
      await loadAll();
      closeModal();
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(m || 'Không thể lưu chuyến.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (t: TripRow) => {
    if (
      !window.confirm(
        `Xóa vĩnh viễn chuyến #${t.id} (${t.tenTuyen} — ${t.ngayDi} ${formatTimeForInput(t.gioDi)})?\n` +
          'Mọi vé và thanh toán gắn với chuyến này cũng sẽ bị xóa. Thao tác không hoàn tác.',
      )
    ) {
      return;
    }
    const removedId = t.id;
    try {
      await api.delete(`/api/manager/trips/${removedId}`);
      setTrips((prev) => prev.filter((x) => x.id !== removedId));
      await loadAll();
    } catch (err: unknown) {
      const m =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Không thể xóa chuyến. Kiểm tra backend, quyền QUAN_TRI, và xem log 500 nếu có.';
      alert(m);
    }
  };

  const onStaffTripStatus = async (tripId: number, trangThai: string) => {
    setSavingStatusId(tripId);
    try {
      await api.patch(`/api/staff/booking/trips/${tripId}/status`, { trangThai });
      await loadAll();
    } catch (err: unknown) {
      const m =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể cập nhật trạng thái chuyến.';
      window.alert(m);
    } finally {
      setSavingStatusId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2.5">
          <span className="w-1.5 h-6 bg-gradient-to-b from-[#ef5222] to-[#fd7e14] rounded-full inline-block" />
          Quản lý chuyến xe
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadAll()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm hover:bg-gray-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Tải lại
          </button>
          {!isStaff && (
            <button
              type="button"
              onClick={openAdd}
              disabled={loading || routes.length === 0 || vehicles.length === 0}
              title={
                routes.length === 0 || vehicles.length === 0
                  ? 'Cần ít nhất một tuyến và một xe trong hệ thống'
                  : undefined
              }
              className="flex items-center gap-2 bg-[#ef5222] hover:bg-[#d94219] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={18} /> Thêm chuyến
            </button>
          )}
        </div>
      </div>

      <AdminPageStats
        title="Thống kê chuyến"
        loading={loading}
        gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-2"
        activeActionKey={tripStatusFilter}
        onItemClick={(key) => {
          setTripStatusFilter(
            key as 'ALL' | 'CHUA_KHOI_HANH' | 'DANG_CHAY' | 'HOAN_THANH' | 'HUY_CHUYEN',
          );
        }}
        items={[
          { label: 'Tổng chuyến', value: tripStats.total, icon: <BusFront size={22} />, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', actionKey: 'ALL' },
          { label: 'Chưa khởi hành', value: tripStats.CHUA_KHOI_HANH, icon: <Timer size={22} />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', actionKey: 'CHUA_KHOI_HANH' },
          { label: 'Đang chạy', value: tripStats.DANG_CHAY, icon: <Play size={22} />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', actionKey: 'DANG_CHAY' },
          { label: 'Hoàn thành', value: tripStats.HOAN_THANH, icon: <Flag size={22} />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', actionKey: 'HOAN_THANH' },
          { label: 'Hủy chuyến', value: tripStats.HUY_CHUYEN, icon: <OctagonX size={22} />, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', actionKey: 'HUY_CHUYEN' },
        ]}
      />

      {loadErr && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">Lỗi tải chuyến / tuyến / xe</p>
          <p className="mt-1">{loadErr}</p>
        </div>
      )}

      {isStaff && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Tài khoản nhân viên: chỉ được cập nhật <strong>trạng thái chuyến</strong> từ danh sách bên dưới, không tạo/sửa/xóa chuyến.
        </p>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-gray-100 bg-gray-50/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-600">
            Khớp lọc: <span className="font-semibold text-gray-800">{displayTrips.length}</span> / {trips.length} chuyến
            {tripStatusFilter !== 'ALL' ? ` (trạng thái: ${tripStatusFilter})` : ''} (mỗi trang {ADMIN_PAGE_SIZE})
          </p>
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={tripSearch}
              onChange={(e) => setTripSearch(e.target.value)}
              placeholder="Tìm ID, tuyến, ngày, biển số, trạng thái…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#ef5222] focus:ring-1 focus:ring-[#ef5222]/20"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-left text-gray-600">
              <tr>
                <th className="px-3 py-3 font-semibold">ID</th>
                <th className="px-3 py-3 font-semibold">Tuyến</th>
                <th className="px-3 py-3 font-semibold">Ngày / giờ</th>
                <th className="px-3 py-3 font-semibold">Xe</th>
                <th className="px-3 py-3 font-semibold">Giá</th>
                <th className="px-3 py-3 font-semibold">Ghế trống</th>
                <th className="px-3 py-3 font-semibold">Trạng thái</th>
                <th className="px-3 py-3 font-semibold w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Đang tải…
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {loadErr ? '—' : 'Chưa có chuyến nào.'}
                  </td>
                </tr>
              ) : displayTrips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {tripSearch.trim()
                      ? `Không có chuyến khớp từ khóa "${tripSearch}".`
                      : tripStatusFilter !== 'ALL'
                        ? `Không có chuyến trạng thái ${tripStatusFilter}. Bấm ô "Tổng chuyến" để xem tất cả.`
                        : 'Không có chuyến khớp bộ lọc.'}
                  </td>
                </tr>
              ) : (
                pageRows.map((t) => (
                  <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                    <td className="px-3 py-3 text-gray-600">{t.id}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-900">{t.tenTuyen}</div>
                      <div className="text-xs text-gray-500">
                        {t.diemDi} → {t.diemDen}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-800 whitespace-nowrap">
                      {t.ngayDi}{' '}
                      <span className="text-gray-500">{formatTimeForInput(t.gioDi)}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-800">
                      <div>{t.bienSo}</div>
                      <div className="text-xs text-gray-500">{t.loaiXe}</div>
                    </td>
                    <td className="px-3 py-3">{String(t.giaVe)} đ</td>
                    <td className="px-3 py-3">
                      {t.soGheTrong}/{t.tongSoGhe}
                    </td>
                    <td className="px-3 py-3">
                      {isStaff ? (
                        <select
                          className="max-w-[160px] rounded border border-amber-200 bg-white px-1.5 py-1 text-xs"
                          value={t.trangThaiChuyen}
                          disabled={savingStatusId === t.id}
                          onChange={(e) => void onStaffTripStatus(t.id, e.target.value)}
                        >
                          {TRIP_STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-900">
                          {t.trangThaiChuyen}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {isStaff ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(t)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                            title="Sửa"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void onDelete(t)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                            title="Xóa chuyến (kèm vé liên quan)"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminListPagination page={tablePage} total={displayTrips.length} onPageChange={setTablePage} />
      </div>

      {modal && !isStaff && (
        <TripFormModal
          mode={modal}
          form={form}
          setForm={setForm}
          routes={routes}
          vehicles={vehicles}
          onSubmit={onSubmit}
          onClose={closeModal}
          saving={saving}
        />
      )}
    </div>
  );
};

export default TripManagement;
