import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Lock,
  Unlock,
  Trash2,
  X,
  Save,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../api/client';
import { getStoredRole } from '../../auth/storage';
import AdminPageStats from '../../components/admin/AdminPageStats';
import AdminListPagination, { ADMIN_PAGE_SIZE } from '../../components/admin/AdminListPagination';

function toNum(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

interface Account {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
}

type RawAccount = {
  id?: unknown;
  email?: unknown;
  fullName?: unknown;
  phone?: unknown;
  status?: unknown;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const CustomerAccountManagement: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [currentAccount, setCurrentAccount] = useState<Partial<Account>>({});
  const [customPassword, setCustomPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [totalKhachHang, setTotalKhachHang] = useState(0);
  const [tablePage, setTablePage] = useState(0);
  const isStaff = getStoredRole() === 'NHAN_VIEN';

  const apiUrl = '/api';

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const r = await api.get('/api/admin/customers?page=0&size=1&search=');
      setTotalKhachHang(toNum(r.data?.data?.totalElements));
    } catch (e) {
      console.error('Lỗi tải thống kê:', e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchAccounts = async (type: 'CUSTOMER' | 'STAFF') => {
    try {
      setLoading(true);
      const endpoint = type === 'CUSTOMER' ? '/admin/customers' : '/admin/staffs';
      const listUrl =
        type === 'CUSTOMER'
          ? `${apiUrl}${endpoint}?page=0&size=100&search=`
          : `${apiUrl}${endpoint}`;
      const response = await api.get(listUrl);
      
      const pageData = response.data?.data;
      const rawData = pageData?.content || pageData || [];
      if (type === 'CUSTOMER' && pageData && typeof (pageData as { totalElements?: unknown }).totalElements !== 'undefined') {
        setTotalKhachHang(toNum((pageData as { totalElements: unknown }).totalElements));
      }

      const transformed: Account[] = (Array.isArray(rawData) ? (rawData as RawAccount[]) : []).map((item) => ({
        id: toNum(item.id),
        email: String(item.email ?? ''),
        name: String(item.fullName ?? 'N/A'),
        phone: item.phone == null ? undefined : String(item.phone),
        role: type,
        status: (item.status === 'ACTIVE' || item.status === 1 ? 'ACTIVE' : 'INACTIVE') as Account['status'],
      }));

      setAccounts(transformed);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu tài khoản:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAccounts('CUSTOMER');
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const q = searchTerm.trim().toLowerCase();
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (!q) return true;
      return (
        String(acc.id).includes(q) ||
        acc.email.toLowerCase().includes(q) ||
        acc.name.toLowerCase().includes(q) ||
        (acc.phone?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [accounts, q]);

  useEffect(() => {
    setTablePage(0);
  }, [searchTerm]);

  const accountTotalPages =
    filteredAccounts.length === 0 ? 0 : Math.max(1, Math.ceil(filteredAccounts.length / ADMIN_PAGE_SIZE));

  useEffect(() => {
    const maxP = Math.max(0, accountTotalPages - 1);
    if (tablePage > maxP) setTablePage(maxP);
  }, [accountTotalPages, tablePage]);

  const pageAccounts = useMemo(() => {
    const start = tablePage * ADMIN_PAGE_SIZE;
    return filteredAccounts.slice(start, start + ADMIN_PAGE_SIZE);
  }, [filteredAccounts, tablePage]);

  const openModal = (mode: 'ADD' | 'EDIT', account?: Account) => {
    setModalMode(mode);
    setCustomPassword('');
    if (mode === 'EDIT' && account) {
      setCurrentAccount({ ...account });
    } else {
      setCurrentAccount({ role: 'CUSTOMER', status: 'ACTIVE' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentAccount({});
    setCustomPassword('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const endpoint = currentAccount.role === 'CUSTOMER' ? '/admin/customers' : '/admin/staffs';
      
      if (modalMode === 'ADD') {
        const ph = String(currentAccount.phone ?? '')
          .replace(/\u00A0/g, ' ')
          .trim();
        const payload: Record<string, string | null> = {
          email: String(currentAccount.email ?? ''),
          fullName: String(currentAccount.name ?? ''),
          password: customPassword || '123456',
        };
        payload.phone = ph.length > 0 ? ph : null;
        await api.post(`${apiUrl}${endpoint}`, payload, {
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        const ph = String(currentAccount.phone ?? '')
          .replace(/\u00A0/g, ' ')
          .trim();
        const payload = {
          fullName: String(currentAccount.name ?? ''),
          phone: ph.length > 0 ? ph : null,
        };
        await api.put(`${apiUrl}${endpoint}/${currentAccount.id}`, payload, {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      void fetchAccounts('CUSTOMER');
      void fetchStats();
      closeModal();
    } catch (error: unknown) {
      console.error('Error saving account:', error);
      alert(getErrorMessage(error, 'Có lỗi xảy ra khi lưu tài khoản!'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, role: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài khoản này vĩnh viễn?')) return;
    try {
      const endpoint = role === 'CUSTOMER' ? `/admin/customers/${id}` : `/admin/staffs/${id}`;
      await api.delete(`${apiUrl}${endpoint}`);
      void fetchAccounts('CUSTOMER');
      void fetchStats();
    } catch (error: unknown) {
      console.error('Error deleting account:', error);
      alert(getErrorMessage(error, 'Có lỗi xảy ra khi xóa tài khoản!'));
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string, role: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const endpoint = role === 'CUSTOMER' ? `/admin/customers/${id}/status` : `/admin/staffs/${id}/status`;
      await api.put(`${apiUrl}${endpoint}`, { status: newStatus });
      void fetchAccounts('CUSTOMER');
      void fetchStats();
    } catch (error: unknown) {
      console.error('Error toggling status:', error);
      alert(getErrorMessage(error, 'Có lỗi xảy ra khi cập nhật trạng thái!'));
    }
  };

  return (
    <div className='flex flex-col gap-5 animate-fade-in'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <h2 className='text-2xl font-bold text-gray-800 flex items-center gap-2.5'>
          <span className="w-1.5 h-6 bg-gradient-to-b from-[#ef5222] to-[#fd7e14] rounded-full inline-block"></span>
          {isStaff ? 'Xem hồ sơ khách hàng' : 'Quản lý khách hàng'}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchStats()}
            className="flex justify-center items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm hover:bg-gray-50"
            title="Làm mới thống kê"
          >
            <RefreshCw size={16} className={statsLoading ? 'animate-spin' : ''} />
            Thống kê
          </button>
          {!isStaff && (
            <button
              onClick={() => openModal('ADD')}
              className='flex justify-center items-center gap-2 bg-[#ef5222] hover:bg-[#d94219] text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm focus:outline-none text-sm'
            >
              <Plus size={18} /> Thêm Tài Khoản Mới
            </button>
          )}
        </div>
      </div>

      <AdminPageStats
        title="Thống kê hồ sơ khách"
        loading={statsLoading}
        className="mb-2"
        gridClassName="grid grid-cols-1 sm:grid-cols-1 gap-4 mb-2"
        items={[
          { label: 'Tổng số khách hàng', value: totalKhachHang, icon: <Activity size={22} />, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
        ]}
      />

      <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
        <div className="flex flex-col gap-2 border-b border-gray-100 bg-gray-50/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-600">
            Khớp lọc: <span className="font-semibold text-gray-800">{filteredAccounts.length}</span> / {accounts.length} khách hàng
            (mỗi trang {ADMIN_PAGE_SIZE}){q ? ' (đã lọc)' : ''}
          </p>
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#ef5222] focus:ring-1 focus:ring-[#ef5222]/20"
              placeholder="Tìm ID, email, tên, SĐT…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse'>
            <thead>
              <tr className='bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-200'>
                <th className='px-5 py-3 font-semibold'>Thông tin</th>
                <th className='px-5 py-3 font-semibold'>Liên hệ</th>
                {!isStaff && <th className='px-5 py-3 font-semibold text-right'>Thao tác</th>}
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100 bg-white'>
              {loading ? (
                <tr>
                  <td colSpan={isStaff ? 2 : 3} className='px-5 py-10 text-center text-gray-400'>
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-6 h-6 rounded-full border-4 border-[#ef5222]/30 border-t-[#ef5222] animate-spin mb-3"></div>
                      <p className="text-sm">Đang tải dữ liệu thực tế từ backend...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAccounts.length > 0 ? (
                pageAccounts.map((account) => (
                  <tr key={account.id} className='hover:bg-orange-50/40 transition-colors'>
                    <td className='px-5 py-3'>
                      <div className='flex items-center'>
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-3 bg-[#ef5222]">
                          {account.name ? account.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <div className='font-semibold text-gray-800 text-sm'>{account.name}</div>
                          <div className='text-xs text-gray-500'>ID: #{account.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className='px-5 py-3'>
                      <div className='text-sm text-gray-800'>{account.email}</div>
                      <div className='text-xs text-gray-500 mt-0.5'>{account.phone || 'Chưa cập nhật'}</div>
                    </td>
                    {!isStaff && (
                    <td className='px-5 py-3 text-right'>
                      <div className='flex justify-end gap-1.5'>
                        <button 
                          className='p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors border border-transparent hover:border-green-100' 
                          title="Chỉnh sửa"
                          onClick={() => openModal('EDIT', account)}
                        >
                          <Edit2 size={16} />
                        </button>
                        {account.status === 'ACTIVE' ? (
                          <button 
                            className='p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors border border-transparent hover:border-orange-100' 
                            title="Khóa tài khoản"
                            onClick={() => handleToggleStatus(account.id, account.status, account.role)}
                          >
                            <Lock size={16} />
                          </button>
                        ) : (
                          <button 
                            className='p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors border border-transparent hover:border-teal-100' 
                            title="Mở khóa"
                            onClick={() => handleToggleStatus(account.id, account.status, account.role)}
                          >
                            <Unlock size={16} />
                          </button>
                        )}
                        <button 
                          className='p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors border border-transparent hover:border-red-100 ml-1' 
                          title="Xóa tài khoản"
                          onClick={() => handleDelete(account.id, account.role)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isStaff ? 2 : 3} className='px-5 py-10 text-center text-gray-500 text-sm'>
                    Không tìm thấy khách hàng nào khớp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AdminListPagination page={tablePage} total={filteredAccounts.length} onPageChange={setTablePage} />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">
                {modalMode === 'ADD' ? 'Thêm Tài Khoản Mới' : 'Chi Tiết & Chỉnh Sửa'}
              </h3>
              <button 
                onClick={closeModal} 
                className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} noValidate className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Địa chỉ Email <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  required
                  disabled={modalMode === 'EDIT'}
                  className={`w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-colors ${modalMode === 'EDIT' ? 'bg-gray-100 text-gray-500' : 'focus:ring-2 focus:ring-[#ef5222]/20 focus:border-[#ef5222]'} focus:outline-none`}
                  value={currentAccount.email || ''}
                  onChange={e => setCurrentAccount({ ...currentAccount, email: e.target.value })}
                  placeholder="ví dụ: admin@vinago.vn"
                />
              </div>
              
              {modalMode === 'ADD' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu <span className="text-gray-400 font-normal">(Tùy chọn)</span></label>
                  <input 
                    type="password" 
                    minLength={6}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#ef5222]/20 focus:border-[#ef5222] transition-colors focus:outline-none"
                    value={customPassword}
                    onChange={e => setCustomPassword(e.target.value)}
                    placeholder="Mật khẩu bảo mật (ít nhất 6 ký tự)"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Mặc định sẽ là "123456" nếu để trống và bạn bỏ qua ô này.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ và Tên <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-colors focus:ring-2 focus:ring-[#ef5222]/20 focus:border-[#ef5222] focus:outline-none"
                  value={currentAccount.name || ''}
                  onChange={e => setCurrentAccount({ ...currentAccount, name: e.target.value })}
                  placeholder="Nhập họ và tên thật"
                />
              </div>

              {(currentAccount.role === 'CUSTOMER' || currentAccount.role === 'STAFF') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại <span className="text-gray-400 font-normal">(Tùy chọn)</span></label>
                  <input 
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="tel"
                    maxLength={11}
                    title="Chỉ nhập số, 10 số bắt đầu bằng 0 (ví dụ: 0912345678)"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#ef5222]/20 focus:border-[#ef5222] transition-colors focus:outline-none"
                    value={currentAccount.phone || ''}
                    onChange={(e) => {
                      const phone = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setCurrentAccount({ ...currentAccount, phone });
                    }}
                    placeholder="Ví dụ: 0912..."
                  />
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 bg-[#ef5222] text-white rounded-lg text-sm font-semibold hover:bg-[#d94219] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : <Save size={16} />}
                  Lưu Thông Tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerAccountManagement;