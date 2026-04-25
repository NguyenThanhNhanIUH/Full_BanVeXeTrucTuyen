import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Lock, Mail, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { setAuth } from '../../auth/storage';
import logoImage from '../../assets/logo.png';

type Tab = 'login' | 'register' | 'forgot';
type RegisterStep = 'form' | 'verifyOtp';
type ForgotStep = 'email' | 'verifyOtp' | 'newPassword';

const LoginPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('login');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('form');
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/';

  const clearNotice = () => {
    setErr('');
    setSuccess('');
  };

  const resetRegisterFlow = () => {
    setRegisterStep('form');
    setOtp('');
  };

  const resetForgotFlow = () => {
    setForgotStep('email');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const goToTab = (next: Tab) => {
    clearNotice();
    setTab(next);
    if (next === 'register') resetRegisterFlow();
    if (next === 'forgot') resetForgotFlow();
    if (next === 'login') {
      resetRegisterFlow();
      resetForgotFlow();
    }
  };

  const clearAllFormFields = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const returnToLoginWithMessage = (message: string) => {
    setErr('');
    setTab('login');
    resetRegisterFlow();
    resetForgotFlow();
    clearAllFormFields();
    setSuccess(message);
  };

  const submitRegisterForm = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotice();
    setLoading(true);
    try {
      await axios.post('/api/auth/register', { email, password, fullName, phone });
      setRegisterStep('verifyOtp');
      setOtp('');
      setSuccess('Đã gửi mã xác thực tới email của bạn.');
    } catch (e: unknown) {
      const response = (e as { response?: { data?: { message?: string } } })?.response?.data;
      setErr(response?.message || 'Không thể đăng ký. Vui lòng kiểm tra thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const resendRegisterOtp = async () => {
    clearNotice();
    setSendingOtp(true);
    try {
      await axios.post('/api/auth/resend-otp', { email });
      setSuccess('Đã gửi lại mã xác thực.');
    } catch (e: unknown) {
      const response = (e as { response?: { data?: { message?: string } } })?.response?.data;
      setErr(response?.message || 'Gửi lại mã thất bại.');
    } finally {
      setSendingOtp(false);
    }
  };

  const submitRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotice();
    setLoading(true);
    try {
      await axios.post('/api/auth/verify-email', { email, otp });
      returnToLoginWithMessage('Đăng ký thành công. Bạn có thể đăng nhập.');
    } catch (e: unknown) {
      const response = (e as { response?: { data?: { message?: string } } })?.response?.data;
      setErr(response?.message || 'Mã xác thực không đúng.');
    } finally {
      setLoading(false);
    }
  };

  const submitForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotice();
    setLoading(true);
    try {
      await axios.post('/api/auth/forgot-password/request-otp', { email });
      setForgotStep('verifyOtp');
      setOtp('');
      setSuccess('Đã gửi mã xác thực tới email.');
    } catch (e: unknown) {
      const response = (e as { response?: { data?: { message?: string } } })?.response?.data;
      setErr(response?.message || 'Không thể gửi mã xác thực.');
    } finally {
      setLoading(false);
    }
  };

  const resendForgotOtp = async () => {
    clearNotice();
    setSendingOtp(true);
    try {
      await axios.post('/api/auth/forgot-password/request-otp', { email });
      setSuccess('Đã gửi lại mã xác thực.');
    } catch (e: unknown) {
      const response = (e as { response?: { data?: { message?: string } } })?.response?.data;
      setErr(response?.message || 'Gửi lại mã thất bại.');
    } finally {
      setSendingOtp(false);
    }
  };

  const submitForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotice();
    setLoading(true);
    try {
      await axios.post('/api/auth/forgot-password/verify-otp', { email, otp });
      setForgotStep('newPassword');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Xác thực thành công. Vui lòng đặt mật khẩu mới.');
    } catch (e: unknown) {
      const response = (e as { response?: { data?: { message?: string } } })?.response?.data;
      setErr(response?.message || 'Mã xác thực không đúng.');
    } finally {
      setLoading(false);
    }
  };

  const submitForgotNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotice();
    setLoading(true);
    try {
      await axios.post('/api/auth/forgot-password/reset', { email, newPassword, confirmPassword });
      returnToLoginWithMessage('Đặt lại mật khẩu thành công. Vui lòng đăng nhập.');
    } catch (e: unknown) {
      const response = (e as { response?: { data?: { message?: string } } })?.response?.data;
      setErr(response?.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const onLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotice();
    setLoading(true);
    try {
      const { data } = await axios.post<{
        accessToken: string;
        tokenType: string;
        email: string;
        role: string;
      }>('/api/auth/login', { email, password });
      const { role, accessToken: token, email: mail } = data;
      if (!token) {
        setErr('Phản hồi đăng nhập không hợp lệ.');
        return;
      }
      setAuth(token, mail || email, role, mail || email);
      if (role === 'QUAN_TRI') {
        navigate('/admin', { replace: true });
      } else {
        const safeFrom = from.startsWith('/admin') ? '/' : from;
        navigate(safeFrom, { replace: true });
      }
    } catch (e: unknown) {
      const response = (e as { response?: { data?: { message?: string } } })?.response?.data;
      setErr(response?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const rightTitle = (): string => {
    if (tab === 'register' && registerStep === 'verifyOtp') return 'Xác thực email';
    if (tab === 'forgot' && forgotStep === 'email') return 'Quên mật khẩu';
    if (tab === 'forgot' && forgotStep === 'verifyOtp') return 'Nhập mã xác thực';
    if (tab === 'forgot' && forgotStep === 'newPassword') return 'Mật khẩu mới';
    if (tab === 'register' && registerStep === 'form') return 'Tạo tài khoản';
    return 'Đăng nhập tài khoản';
  };

  const showAuthTabs = tab === 'login' || (tab === 'register' && registerStep === 'form') || (tab === 'forgot' && forgotStep === 'email');

  return (
    <div className="min-h-screen bg-[#f6f6f6]">
      <div className="h-36 bg-gradient-to-r from-[#ff8d1a] via-[#ff6c12] to-[#ef5222]" />

      <div className="-mt-16 px-4 pb-10">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-[#f2d2c8] bg-white shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 md:p-10 bg-[#fffdfc]">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 border border-[#f3e0d8] shadow-sm">
                <img src={logoImage} alt="VinaGo" className="h-8 w-auto object-contain" />
                <span className="text-base font-extrabold leading-none tracking-tight">
                  <span className="text-[#0e5a32]">Vina</span>
                  <span className="text-[#e32222]">Go</span>
                </span>
              </div>

              <h2 className="mt-6 text-3xl font-extrabold text-[#0e5a32]">VINAGO</h2>
              <p className="mt-1 text-2xl font-bold text-[#e0663c]">Cùng bạn trên mọi nẻo đường</p>

              <div className="mt-10">
                <p className="text-4xl font-extrabold leading-tight text-[#00613d]">
                  XE TRUNG CHUYỂN
                  <br />
                  ĐÓN - TRẢ TẬN NƠI
                </p>
              </div>
            </div>

            <div className="p-8 md:p-10">
              {tab === 'forgot' && forgotStep !== 'email' && (
                <button
                  type="button"
                  onClick={() => {
                    if (forgotStep === 'newPassword') setForgotStep('verifyOtp');
                    else setForgotStep('email');
                    clearNotice();
                    setOtp('');
                  }}
                  className="mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-[#ef5222]"
                >
                  <ArrowLeft size={16} />
                  Quay lại
                </button>
              )}
              {tab === 'register' && registerStep === 'verifyOtp' && (
                <button
                  type="button"
                  onClick={() => {
                    resetRegisterFlow();
                    clearNotice();
                  }}
                  className="mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-[#ef5222]"
                >
                  <ArrowLeft size={16} />
                  Quay lại
                </button>
              )}

              <h3 className="text-3xl font-semibold text-gray-800">{rightTitle()}</h3>

              {showAuthTabs && (
                <div className="mt-7 border-b border-gray-200 flex items-center gap-10">
                  <button
                    type="button"
                    onClick={() => goToTab('login')}
                    className={`pb-3 font-semibold border-b-2 ${tab === 'login' ? 'text-[#ef5222] border-[#ef5222]' : 'text-gray-500 border-transparent'}`}
                  >
                    ĐĂNG NHẬP
                  </button>
                  <button
                    type="button"
                    onClick={() => goToTab('register')}
                    className={`pb-3 font-semibold border-b-2 ${tab === 'register' ? 'text-[#ef5222] border-[#ef5222]' : 'text-gray-500 border-transparent'}`}
                  >
                    ĐĂNG KÝ
                  </button>
                </div>
              )}

              {tab === 'login' && (
                <form onSubmit={onLoginSubmit} autoComplete="off" className="mt-6 space-y-4">
                  {err && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</div>}
                  {success && <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{success}</div>}
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ef5222]" />
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      placeholder="Nhập email"
                      className="w-full pl-10 pr-3 py-3 border border-[#f4c9bd] rounded-lg text-sm focus:ring-2 focus:ring-[#ef5222]/20 focus:border-[#ef5222] outline-none"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete="off"
                      placeholder="Nhập mật khẩu"
                      className="w-full pl-10 pr-3 py-3 border border-[#f4c9bd] rounded-lg text-sm focus:ring-2 focus:ring-[#ef5222]/20 focus:border-[#ef5222] outline-none"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#ef5222] hover:bg-[#d94219] text-white font-semibold rounded-full transition disabled:opacity-50"
                  >
                    {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <LogIn size={18} />}
                    Đăng nhập
                  </button>
                  <button
                    type="button"
                    onClick={() => goToTab('forgot')}
                    className="text-sm text-gray-500 hover:text-[#ef5222]"
                  >
                    Quên mật khẩu
                  </button>
                </form>
              )}

              {tab === 'register' && registerStep === 'form' && (
                <form onSubmit={submitRegisterForm} autoComplete="off" className="mt-6 space-y-4">
                  {err && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</div>}
                  {success && <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{success}</div>}
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ef5222]" />
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      placeholder="Nhập email"
                      className="w-full pl-10 pr-3 py-3 border border-[#f4c9bd] rounded-lg text-sm focus:ring-2 focus:ring-[#ef5222]/20 focus:border-[#ef5222] outline-none"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="Họ và tên"
                    className="w-full px-3 py-3 border border-[#f4c9bd] rounded-lg text-sm focus:ring-2 focus:ring-[#ef5222]/20 focus:border-[#ef5222] outline-none"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Số điện thoại"
                    className="w-full px-3 py-3 border border-[#f4c9bd] rounded-lg text-sm focus:ring-2 focus:ring-[#ef5222]/20 focus:border-[#ef5222] outline-none"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete="off"
                      placeholder="Nhập mật khẩu"
                      className="w-full pl-10 pr-3 py-3 border border-[#f4c9bd] rounded-lg text-sm focus:ring-2 focus:ring-[#ef5222]/20 focus:border-[#ef5222] outline-none"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#ef5222] hover:bg-[#d94219] text-white font-semibold rounded-full transition disabled:opacity-50"
                  >
                    {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <LogIn size={18} />}
                    Đăng ký
                  </button>
                  <button type="button" onClick={() => goToTab('login')} className="text-sm text-gray-500 hover:text-[#ef5222]">
                    Quay lại đăng nhập
                  </button>
                </form>
              )}

              {tab === 'register' && registerStep === 'verifyOtp' && (
                <form onSubmit={submitRegisterOtp} autoComplete="off" className="mt-6 space-y-4">
                  {err && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</div>}
                  {success && <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{success}</div>}
                  <p className="text-sm text-gray-600">Mã xác thực đã gửi tới: <span className="font-medium text-gray-800">{email}</span></p>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    autoComplete="one-time-code"
                    placeholder="Nhập mã 6 số"
                    className="w-full px-3 py-3 border border-[#f4c9bd] rounded-lg text-sm tracking-widest text-center text-lg focus:ring-2 focus:ring-[#ef5222]/20 focus:border-[#ef5222] outline-none"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <button
                    type="button"
                    onClick={resendRegisterOtp}
                    disabled={sendingOtp}
                    className="w-full text-sm text-[#ef5222] font-medium hover:underline disabled:opacity-50"
                  >
                    {sendingOtp ? 'Đang gửi...' : 'Gửi lại mã'}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#ef5222] hover:bg-[#d94219] text-white font-semibold rounded-full transition disabled:opacity-50"
                  >
                    {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                    Xác nhận
                  </button>
                </form>
              )}

              {tab === 'forgot' && forgotStep === 'email' && (
                <form onSubmit={submitForgotEmail} autoComplete="off" className="mt-6 space-y-4">
                  {err && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</div>}
                  {success && <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{success}</div>}
                  <p className="text-sm text-gray-600">Nhập email tài khoản để nhận mã xác thực.</p>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ef5222]" />
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      placeholder="Nhập email"
                      className="w-full pl-10 pr-3 py-3 border border-[#f4c9bd] rounded-lg text-sm focus:ring-2 focus:ring-[#ef5222]/20 focus:border-[#ef5222] outline-none"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#ef5222] hover:bg-[#d94219] text-white font-semibold rounded-full transition disabled:opacity-50"
                  >
                    {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                    Xác nhận
                  </button>
                  <button type="button" onClick={() => goToTab('login')} className="text-sm text-gray-500 hover:text-[#ef5222]">
                    Quay lại đăng nhập
                  </button>
                </form>
              )}

              {tab === 'forgot' && forgotStep === 'verifyOtp' && (
                <form onSubmit={submitForgotOtp} autoComplete="off" className="mt-6 space-y-4">
                  {err && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</div>}
                  {success && <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{success}</div>}
                  <p className="text-sm text-gray-600">Mã đã gửi tới: <span className="font-medium text-gray-800">{email}</span></p>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    autoComplete="one-time-code"
                    placeholder="Nhập mã 6 số"
                    className="w-full px-3 py-3 border border-[#f4c9bd] rounded-lg text-sm tracking-widest text-center text-lg focus:ring-2 focus:ring-[#ef5222]/20 focus:border-[#ef5222] outline-none"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <button
                    type="button"
                    onClick={resendForgotOtp}
                    disabled={sendingOtp}
                    className="w-full text-sm text-[#ef5222] font-medium hover:underline disabled:opacity-50"
                  >
                    {sendingOtp ? 'Đang gửi...' : 'Gửi lại mã'}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#ef5222] hover:bg-[#d94219] text-white font-semibold rounded-full transition disabled:opacity-50"
                  >
                    {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                    Xác nhận
                  </button>
                </form>
              )}

              {tab === 'forgot' && forgotStep === 'newPassword' && (
                <form onSubmit={submitForgotNewPassword} autoComplete="off" className="mt-6 space-y-4">
                  {err && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</div>}
                  {success && <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{success}</div>}
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Mật khẩu mới"
                      className="w-full pl-10 pr-3 py-3 border border-[#f4c9bd] rounded-lg text-sm focus:ring-2 focus:ring-[#ef5222]/20 focus:border-[#ef5222] outline-none"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Xác nhận mật khẩu mới"
                      className="w-full pl-10 pr-3 py-3 border border-[#f4c9bd] rounded-lg text-sm focus:ring-2 focus:ring-[#ef5222]/20 focus:border-[#ef5222] outline-none"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#ef5222] hover:bg-[#d94219] text-white font-semibold rounded-full transition disabled:opacity-50"
                  >
                    {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                    Hoàn tất
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
