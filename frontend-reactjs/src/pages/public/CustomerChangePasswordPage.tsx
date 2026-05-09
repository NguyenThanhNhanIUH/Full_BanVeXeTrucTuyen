import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../../api/client';
import { getStoredPhone, getStoredRole, getToken } from '../../auth/storage';
import CustomerAccountShell from '../../components/account/CustomerAccountShell';

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

const CustomerChangePasswordPage = () => {
  const role = getStoredRole();
  const token = getToken();
  const phone = getStoredPhone();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!token || role !== 'KHACH_HANG') {
    return <Navigate to="/login" replace />;
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void (async () => {
      if (saving) return;
      setSaving(true);
      setError('');
      setSuccess('');
      if (newPassword.length < 6) {
        setSaving(false);
        setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setSaving(false);
        setError('Mật khẩu xác nhận không khớp.');
        return;
      }
      if (newPassword === oldPassword) {
        setSaving(false);
        setError('Mật khẩu mới phải khác mật khẩu hiện tại.');
        return;
      }
      try {
        const res = await api.put<ApiResponse<null>>('/api/accounts/me/password', {
          oldPassword,
          newPassword,
          confirmPassword,
        });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccess(res.data?.message || 'Đổi mật khẩu thành công.');
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || 'Đổi mật khẩu thất bại.');
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <CustomerAccountShell
      active="password"
      title="Đặt lại mật khẩu"
      subtitle="Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác"
    >
      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6">
        <p className="mb-5 text-center text-4xl font-semibold text-[#151515]">{phone ? `(+84) ${phone.replace(/^0/, '')}` : '**********'}</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-gray-700">Mật khẩu cũ</span>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 outline-none transition focus:border-[#ef5222]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-gray-700">Mật khẩu mới</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 outline-none transition focus:border-[#ef5222]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-gray-700">Xác nhận mật khẩu</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 outline-none transition focus:border-[#ef5222]"
            />
          </label>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {success && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setError('');
                setSuccess('');
              }}
              className="rounded-full border border-gray-300 px-10 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#ef5222] px-10 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d84a1e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
          </div>
        </form>
      </div>
    </CustomerAccountShell>
  );
};

export default CustomerChangePasswordPage;
