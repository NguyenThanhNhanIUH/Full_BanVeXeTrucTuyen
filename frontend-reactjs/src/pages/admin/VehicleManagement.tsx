import React, { useEffect, useMemo, useState } from 'react';
import { Truck, Plus, Pencil, Trash2, X, Save, RefreshCw, Armchair, BarChart2, Search } from 'lucide-react';
import { api } from '../../api/client';
import AdminPageStats from '../../components/admin/AdminPageStats';
import AdminListPagination, { ADMIN_PAGE_SIZE } from '../../components/admin/AdminListPagination';

type VehicleRow = {
  id: number;
  bienSo: string;
  loaiXe: string;
  soGhe: number;
};

const emptyForm = {
  bienSo: '',
  loaiXe: '',
  soGhe: '' as string,
};

const VehicleManagement: React.FC = () => {
  const [list, setList] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [tablePage, setTablePage] = useState(0);

  const load = async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const { data: body } = await api.get('/api/manager/vehicles');
      const raw = body?.data ?? [];
      setList(Array.isArray(raw) ? raw : []);
    } catch (e) {
      console.error(e);
      setList([]);
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không tải được danh sách xe (mạng, backend, hoặc chưa đăng nhập quản trị / JWT hết hạn).';
      setLoadErr(String(msg));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const vehStats = useMemo(() => {
    const n = list.length;
    const sumGhe = list.reduce((s, v) => s + (v.soGhe || 0), 0);
    const avg = n > 0 ? Math.round((sumGhe / n) * 10) / 10 : 0;
    return { total: n, sumGhe, avg };
  }, [list]);

  const displayVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    const sorted = [...list].sort((a, b) => a.id - b.id);
    if (!q) return sorted;
    return sorted.filter((v) => {
      const hay = [String(v.id), v.bienSo, v.loaiXe, String(v.soGhe)].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [list, vehicleSearch]);

  useEffect(() => {
    setTablePage(0);
  }, [vehicleSearch]);

  const vehTotalPages = displayVehicles.length === 0 ? 0 : Math.max(1, Math.ceil(displayVehicles.length / ADMIN_PAGE_SIZE));

  useEffect(() => {
    const maxP = Math.max(0, vehTotalPages - 1);
    if (tablePage > maxP) setTablePage(maxP);
  }, [vehTotalPages, tablePage]);

  const pageRows = useMemo(() => {
    const start = tablePage * ADMIN_PAGE_SIZE;
    return displayVehicles.slice(start, start + ADMIN_PAGE_SIZE);
  }, [displayVehicles, tablePage]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModal('add');
  };

  const openEdit = (v: VehicleRow) => {
    setEditingId(v.id);
    setForm({
      bienSo: v.bienSo,
      loaiXe: v.loaiXe,
      soGhe: String(v.soGhe),
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
    setSaving(true);
    try {
      const soGhe = parseInt(form.soGhe, 10);
      if (Number.isNaN(soGhe) || soGhe < 1) {
        alert('Số ghế phải là số nguyên dương.');
        return;
      }
      const payload = {
        bienSo: form.bienSo.trim(),
        loaiXe: form.loaiXe.trim(),
        soGhe,
      };
      if (modal === 'add') {
        await api.post('/api/manager/vehicles', payload);
      } else if (editingId != null) {
        await api.put(`/api/manager/vehicles/${editingId}`, payload);
      }
      await load();
      closeModal();
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(m || 'Không thể lưu xe.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (v: VehicleRow) => {
    if (!window.confirm(`Xóa xe biển số «${v.bienSo}»? (Chỉ xóa được khi xe chưa gắn chuyến.)`)) return;
    try {
      await api.delete(`/api/manager/vehicles/${v.id}`);
      await load();
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(m || 'Không thể xóa xe.');
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2.5">
          <span className="w-1.5 h-6 bg-gradient-to-b from-[#ef5222] to-[#fd7e14] rounded-full inline-block" />
          Quản lý xe
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
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 bg-[#ef5222] hover:bg-[#d94219] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
          >
            <Plus size={18} /> Thêm xe
          </button>
        </div>
      </div>

      <AdminPageStats
        title="Thống kê xe"
        loading={loading}
        gridClassName="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2"
        items={[
          { label: 'Tổng số xe', value: vehStats.total, icon: <Truck size={22} />, color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
          { label: 'Tổng sức chỗ (ghế)', value: vehStats.sumGhe, icon: <Armchair size={22} />, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
          { label: 'Trung bình ghế / xe', value: vehStats.avg, icon: <BarChart2 size={22} />, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
        ]}
      />
      <p className="text-xs text-gray-500 -mt-2 mb-2">Bảng sắp xếp theo ID; tìm theo ID, biển số, loại xe, số ghế.</p>

      {loadErr && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">Lỗi tải danh sách xe</p>
          <p className="mt-1">{loadErr}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-gray-100 bg-gray-50/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-600">
            Khớp lọc: <span className="font-semibold text-gray-800">{displayVehicles.length}</span> / {list.length} xe (mỗi trang {ADMIN_PAGE_SIZE})
          </p>
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              placeholder="Tìm ID, biển số, loại xe…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#ef5222] focus:ring-1 focus:ring-[#ef5222]/20"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Biển số</th>
                <th className="px-4 py-3 font-semibold">Loại xe</th>
                <th className="px-4 py-3 font-semibold">Số ghế</th>
                <th className="px-4 py-3 font-semibold w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Đang tải…
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    {loadErr
                      ? 'Không tải được dữ liệu (xem thông báo lỗi phía trên).'
                      : 'Chưa có xe nào. Thêm xe hoặc import dữ liệu mẫu vào CSDL.'}
                  </td>
                </tr>
              ) : displayVehicles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Không có xe khớp &quot;{vehicleSearch}&quot;.
                  </td>
                </tr>
              ) : (
                pageRows.map((v) => (
                  <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                    <td className="px-4 py-3 text-gray-600">{v.id}</td>
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{v.bienSo}</td>
                    <td className="px-4 py-3 text-gray-800">{v.loaiXe}</td>
                    <td className="px-4 py-3">{v.soGhe}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(v)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                          title="Sửa"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDelete(v)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminListPagination page={tablePage} total={displayVehicles.length} onPageChange={setTablePage} />
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-900">
                <Truck className="text-[#ef5222]" size={20} />
                {modal === 'add' ? 'Thêm xe' : 'Sửa xe'}
              </h3>
              <button type="button" onClick={closeModal} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={onSubmit} className="p-4 space-y-3">
              <div>
                <label className="text-sm text-gray-700">Biển số</label>
                <input
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                  value={form.bienSo}
                  onChange={(e) => setForm((f) => ({ ...f, bienSo: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Loại xe</label>
                <input
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.loaiXe}
                  onChange={(e) => setForm((f) => ({ ...f, loaiXe: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Số ghế</label>
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.soGhe}
                  onChange={(e) => setForm((f) => ({ ...f, soGhe: e.target.value }))}
                  required
                />
              </div>
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

export default VehicleManagement;
