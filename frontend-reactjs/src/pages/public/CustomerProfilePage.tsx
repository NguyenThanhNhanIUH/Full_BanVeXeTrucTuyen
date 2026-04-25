import { FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../../api/client';
import { getStoredEmail, getStoredRole, getToken, setAuth } from '../../auth/storage';
import CustomerAccountShell from '../../components/account/CustomerAccountShell';

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

type CustomerProfileResponse = {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  status: string;
};

const CustomerProfilePage = () => {
  const role = getStoredRole();
  const token = getToken();
  const currentEmail = getStoredEmail();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get<ApiResponse<CustomerProfileResponse>>('/api/accounts/me/profile');
        const p = res.data?.data;
        setEmail(p?.email ?? '');
        setFullName(p?.fullName ?? '');
        setPhone((p?.phone ?? '').trim());
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || 'Không thể tải thông tin tài khoản.');
      } finally {
        setLoading(false);
      }
    };
    void loadProfile();
  }, []);

  if (!token || role !== 'KHACH_HANG') {
    return <Navigate to="/login" replace />;
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isEditMode) {
      setIsEditMode(true);
      setError('');
      setSuccess('Bạn có thể chỉnh sửa thông tin rồi bấm Lưu cập nhật.');
      return;
    }
    void (async () => {
      if (saving) return;
      setSaving(true);
      setError('');
      setSuccess('');
      try {
        const res = await api.put<ApiResponse<CustomerProfileResponse>>('/api/accounts/me/profile', {
          fullName: fullName.trim(),
          phone: phone.trim() || null,
        });
        const p = res.data?.data;
        setEmail(p?.email ?? email);
        setFullName(p?.fullName ?? fullName);
        setPhone((p?.phone ?? phone).trim());
        if (token && currentEmail && role) {
          setAuth(token, currentEmail, role, p?.fullName ?? fullName.trim(), p?.phone ?? phone.trim());
        }
        setIsEditMode(false);
        setSuccess(res.data?.message || 'Cập nhật thông tin thành công.');
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || 'Cập nhật thông tin thất bại.');
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <CustomerAccountShell
      active="profile"
      title="Thông tin tài khoản"
      subtitle="Quản lý thông tin hồ sơ để bảo mật tài khoản"
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        {loading ? (
          <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <div className="flex flex-col items-center">
              <div className="flex h-40 w-40 items-center justify-center rounded-full bg-[#e9f5fb] text-5xl font-bold text-[#86b9cf]">
                {fullName.trim().charAt(0).toUpperCase() || 'U'}
              </div>
              <button
                type="button"
                className="mt-5 rounded-full border border-gray-300 px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Chọn ảnh
              </button>
              <p className="mt-3 text-center text-xs text-gray-400">Dung lượng file tối đa 1 MB định dạng .JPEG, .PNG</p>
            </div>

            <div>
              <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm text-gray-500">Họ và tên</span>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    maxLength={100}
                    disabled={!isEditMode}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:bg-gray-100 focus:border-[#ef5222]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm text-gray-500">Số điện thoại</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={20}
                    disabled={!isEditMode}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:bg-gray-100 focus:border-[#ef5222]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm text-gray-500">Email</span>
                  <input
                    value={email}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-500"
                  />
                </label>
              </div>

              {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {success && <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#ef5222] px-12 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d84a1e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Đang lưu...' : isEditMode ? 'Lưu cập nhật' : 'Cập nhật'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </CustomerAccountShell>
  );
};

export default CustomerProfilePage;
