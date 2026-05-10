import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, X, Save, RefreshCw, Layers, CheckCircle, Ban, Search } from 'lucide-react';
import { api } from '../../api/client';
import { getStoredRole } from '../../auth/storage';
import AdminPageStats from '../../components/admin/AdminPageStats';
import AdminListPagination, { ADMIN_PAGE_SIZE } from '../../components/admin/AdminListPagination';

type RouteRow = {
  id: number;
  tenTuyen: string;
  diemDi: string;
  diemDen: string;
  khoangCach?: number | null;
  thoiGianDuKienPhut?: number | null;
  giaVeCoBan: number | string;
  trangThai: string;
  soChuyenXe?: number;
};

const emptyForm = {
  tenTuyen: '',
  diemDi: '',
  diemDen: '',
  khoangCach: '' as string,
  thoiGianDuKienPhut: '' as string,
  giaVeCoBan: '',
  trangThai: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
};

const RouteManagement: React.FC = () => {
  const [list, setList] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [routeSearch, setRouteSearch] = useState('');
  const [routeStatusFilter, setRouteStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [tablePage, setTablePage] = useState(0);
  const isStaff = getStoredRole() === 'NHAN_VIEN';

  const load = async () => {
    setLoading(true);
    try {
      const { data: body } = await api.get('/api/manager/routes');
      const raw = body?.data ?? [];
      setList(Array.isArray(raw) ? raw : []);
    } catch (e) {
      console.error(e);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      trangThai: 'ACTIVE',
    });
    setModal('add');
  };

  const openEdit = (r: RouteRow) => {
    setEditingId(r.id);
    setForm({
      tenTuyen: r.tenTuyen,
      diemDi: r.diemDi,
      diemDen: r.diemDen,
      khoangCach: r.khoangCach != null ? String(r.khoangCach) : '',
      thoiGianDuKienPhut: r.thoiGianDuKienPhut != null ? String(r.thoiGianDuKienPhut) : '',
      giaVeCoBan: String(r.giaVeCoBan),
      trangThai: r.trangThai === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    });
    setModal('edit');
  };

  const closeModal = () => {
    setModal(null);
    setEditingId(null);
    setForm(emptyForm);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStaff) return;
    setSaving(true);
    try {
      const gia = Number(form.giaVeCoBan);
      if (Number.isNaN(gia) || gia <= 0) {
        alert('Giá vé cơ bản phải là số dương.');
        return;
      }
      const km = form.khoangCach.trim() ? Number(form.khoangCach) : null;
      const phut = form.thoiGianDuKienPhut.trim() ? parseInt(form.thoiGianDuKienPhut, 10) : null;
      if (modal === 'add') {
        await api.post('/api/manager/routes', {
          tenTuyen: form.tenTuyen.trim(),
          diemDi: form.diemDi.trim(),
          diemDen: form.diemDen.trim(),
          khoangCach: km,
          thoiGianDuKienPhut: phut,
          giaVeCoBan: gia,
        });
      } else if (editingId != null) {
        await api.put(`/api/manager/routes/${editingId}`, {
          tenTuyen: form.tenTuyen.trim(),
          diemDi: form.diemDi.trim(),
          diemDen: form.diemDen.trim(),
          khoangCach: km,
          thoiGianDuKienPhut: phut,
          giaVeCoBan: gia,
          trangThai: form.trangThai,
        });
      }
      await load();
      closeModal();
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(m || 'Không thể lưu tuyến.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (r: RouteRow) => {
    if (isStaff) return;
    if (!window.confirm(`Xóa / ngừng hoạt động tuyến «${r.tenTuyen}»?`)) return;
    try {
      await api.delete(`/api/manager/routes/${r.id}`);
      await load();
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(m || 'Không thể xóa tuyến.');
    }
  };

  const routeStats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const r of list) {
      if (r.trangThai === 'ACTIVE') active += 1;
      else inactive += 1;
    }
    return { total: list.length, active, inactive };
  }, [list]);

  const displayRoutes = useMemo(() => {
    const q = routeSearch.trim().toLowerCase();
    let base = list;
    if (routeStatusFilter !== 'ALL') {
      base = list.filter((r) => r.trangThai === routeStatusFilter);
    }
    const sorted = [...base].sort((a, b) => a.id - b.id);
    if (!q) return sorted;
    return sorted.filter((r) => {
      const hay = [
        String(r.id),
        r.tenTuyen,
        r.diemDi,
        r.diemDen,
        r.trangThai,
        r.khoangCach != null ? String(r.khoangCach) : '',
        r.thoiGianDuKienPhut != null ? String(r.thoiGianDuKienPhut) : '',
        String(r.giaVeCoBan),
        r.soChuyenXe != null ? String(r.soChuyenXe) : '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [list, routeSearch, routeStatusFilter]);

  useEffect(() => {
    setTablePage(0);
  }, [routeSearch, routeStatusFilter]);

  const routeTotalPages = displayRoutes.length === 0 ? 0 : Math.max(1, Math.ceil(displayRoutes.length / ADMIN_PAGE_SIZE));

  useEffect(() => {
    const maxP = Math.max(0, routeTotalPages - 1);
    if (tablePage > maxP) setTablePage(maxP);
  }, [routeTotalPages, tablePage]);

  const pageRows = useMemo(() => {
    const start = tablePage * ADMIN_PAGE_SIZE;
    return displayRoutes.slice(start, start + ADMIN_PAGE_SIZE);
  }, [displayRoutes, tablePage]);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2.5">
          <span className="w-1.5 h-6 bg-gradient-to-b from-[#ef5222] to-[#fd7e14] rounded-full inline-block" />
          {isStaff ? 'Tuyến xe (chỉ xem)' : 'Quản lý tuyến xe'}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm hover:bg-gray-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Tải lại
          </button>
          {!isStaff && (
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-2 bg-[#ef5222] hover:bg-[#d94219] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
            >
              <Plus size={18} /> Thêm tuyến
            </button>
          )}
        </div>
      </div>

      <AdminPageStats
        title="Thống kê tuyến"
        loading={loading}
        activeActionKey={routeStatusFilter}
        onItemClick={(key) => setRouteStatusFilter(key as 'ALL' | 'ACTIVE' | 'INACTIVE')}
        items={[
          { label: 'Tổng tuyến', value: routeStats.total, icon: <Layers size={22} />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', actionKey: 'ALL' },
          { label: 'Đang hoạt động (ACTIVE)', value: routeStats.active, icon: <CheckCircle size={22} />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', actionKey: 'ACTIVE' },
          { label: 'Ngừng hoạt động (INACTIVE)', value: routeStats.inactive, icon: <Ban size={22} />, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', actionKey: 'INACTIVE' },
        ]}
        gridClassName="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2"
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-gray-100 bg-gray-50/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-600">
            Khớp lọc: <span className="font-semibold text-gray-800">{displayRoutes.length}</span> / {list.length} tuyến
            {routeStatusFilter !== 'ALL' ? ` (${routeStatusFilter})` : ''} (mỗi trang {ADMIN_PAGE_SIZE})
          </p>
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={routeSearch}
              onChange={(e) => setRouteSearch(e.target.value)}
              placeholder="Tìm ID, tên tuyến, điểm đi/đến, trạng thái…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#ef5222] focus:ring-1 focus:ring-[#ef5222]/20"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-left text-gray-600">
              <tr>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">ID</th>
                <th className="px-3 py-3 font-semibold min-w-[140px]">Tên tuyến</th>
                <th className="px-3 py-3 font-semibold min-w-[120px]">Điểm đi</th>
                <th className="px-3 py-3 font-semibold min-w-[120px]">Điểm đến</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">Khoảng cách (km)</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">TG dự kiến (phút)</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">Giá cơ bản (đ)</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap text-center">Số chuyến</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">Trạng thái</th>
                {!isStaff && <th className="px-3 py-3 font-semibold w-28">Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isStaff ? 10 : 11} className="px-4 py-8 text-center text-gray-500">
                    Đang tải…
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={isStaff ? 10 : 11} className="px-4 py-8 text-center text-gray-500">
                    Chưa có tuyến nào.
                  </td>
                </tr>
              ) : displayRoutes.length === 0 ? (
                <tr>
                  <td colSpan={isStaff ? 10 : 11} className="px-4 py-8 text-center text-gray-500">
                    {routeSearch.trim()
                      ? `Không có tuyến khớp "${routeSearch}".`
                      : routeStatusFilter !== 'ALL'
                        ? `Không có tuyến ${routeStatusFilter}. Bấm "Tổng tuyến" để xem tất cả.`
                        : 'Không có tuyến khớp bộ lọc.'}
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                    <td className="px-3 py-3 text-gray-600">{r.id}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">{r.tenTuyen}</td>
                    <td className="px-3 py-3 text-gray-700">{r.diemDi}</td>
                    <td className="px-3 py-3 text-gray-700">{r.diemDen}</td>
                    <td className="px-3 py-3 text-gray-800">{r.khoangCach != null ? String(r.khoangCach) : '—'}</td>
                    <td className="px-3 py-3 text-gray-800">{r.thoiGianDuKienPhut != null ? String(r.thoiGianDuKienPhut) : '—'}</td>
                    <td className="px-3 py-3 text-gray-800 whitespace-nowrap">{String(r.giaVeCoBan)}</td>
                    <td className="px-3 py-3 text-center font-semibold text-gray-800 tabular-nums">
                      {r.soChuyenXe != null ? r.soChuyenXe : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          r.trangThai === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {r.trangThai}
                      </span>
                    </td>
                    {!isStaff && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                            title="Sửa"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void onDelete(r)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                            title="Xóa / ngừng"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminListPagination page={tablePage} total={displayRoutes.length} onPageChange={setTablePage} />
      </div>

      {modal && !isStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-900">
                <MapPin className="text-[#ef5222]" size={20} />
                {modal === 'add' ? 'Thêm tuyến' : 'Sửa tuyến'}
              </h3>
              <button type="button" onClick={closeModal} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={onSubmit} className="p-4 space-y-3">
              <div>
                <label className="text-sm text-gray-700">Tên tuyến</label>
                <input
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.tenTuyen}
                  onChange={(e) => setForm((f) => ({ ...f, tenTuyen: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-700">Điểm đi</label>
                  <input
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.diemDi}
                    onChange={(e) => setForm((f) => ({ ...f, diemDi: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Điểm đến</label>
                  <input
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.diemDen}
                    onChange={(e) => setForm((f) => ({ ...f, diemDen: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-700">Khoảng cách (km, tùy chọn)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.khoangCach}
                    onChange={(e) => setForm((f) => ({ ...f, khoangCach: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Thời gian dự kiến (phút, tùy chọn)</label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.thoiGianDuKienPhut}
                    onChange={(e) => setForm((f) => ({ ...f, thoiGianDuKienPhut: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-700">Giá vé cơ bản (VNĐ)</label>
                <input
                  type="number"
                  min={0}
                  step="1000"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.giaVeCoBan}
                  onChange={(e) => setForm((f) => ({ ...f, giaVeCoBan: e.target.value }))}
                  required
                />
              </div>
              {modal === 'edit' && (
                <div>
                  <label className="text-sm text-gray-700">Trạng thái tuyến</label>
                  <select
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.trangThai}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, trangThai: e.target.value as 'ACTIVE' | 'INACTIVE' }))
                    }
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#ef5222] text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteManagement;
