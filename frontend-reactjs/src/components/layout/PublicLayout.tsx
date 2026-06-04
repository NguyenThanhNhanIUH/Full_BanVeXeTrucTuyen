import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { User, Phone, Mail, MapPin, Menu, X, UserCircle2, History, KeyRound, LogOut, ChevronDown, Bell } from 'lucide-react';
import { clearAuth, getStoredEmail, getStoredName, getStoredRole } from '../../auth/storage';
import type { PublicBranding } from '../../types/publicBranding';
import logoImage from '../../assets/logo.png';
import HelpBubble from '../common/HelpBubble';
import { REALTIME_FAST_POLL_MS } from '../../constants/realtimePoll';

const defaultBranding: PublicBranding = { logoUrl: null, bannerUrl: null };

type CustomerNotification = {
  id: number;
  tieuDe: string;
  noiDung: string;
  loai?: string;
  veXeId?: number;
  daDoc: boolean;
  createdAt?: string;
};

type ApiResponse<T> = { code: number; message: string; data: T };

const PublicLayout = () => {
  const [branding, setBranding] = useState<PublicBranding>(defaultBranding);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const notifMenuRef = useRef<HTMLDivElement | null>(null);
  const closeMenuTimerRef = useRef<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = getStoredRole();
  const userEmail = getStoredEmail();
  const userName = getStoredName() || userEmail;
  const isAdmin = userRole === 'QUAN_TRI';
  const isCustomer = userRole === 'KHACH_HANG';
  const isLoggedIn = Boolean(userRole && userEmail);

  const shortText = (value: string | null, maxLength = 14) => {
    if (!value) return '';
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
  };

  const onLogout = () => {
    clearAuth();
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
    navigate('/', { replace: true });
  };

  useEffect(() => {
    setIsProfileMenuOpen(false);
    setIsNotifOpen(false);
  }, [location.pathname]);

  const loadNotifications = async () => {
    if (!isCustomer) return;
    try {
      const [listRes, countRes] = await Promise.all([
        api.get<ApiResponse<CustomerNotification[]>>('/api/me/notifications'),
        api.get<ApiResponse<{ count: number }>>('/api/me/notifications/unread-count'),
      ]);
      setNotifications(listRes.data?.data ?? []);
      setUnreadCount(countRes.data?.data?.count ?? 0);
    } catch {
      // ignore when token expired
    }
  };

  useEffect(() => {
    if (!isCustomer) return;
    void loadNotifications();
    const onVis = () => {
      if (document.visibilityState === 'visible') void loadNotifications();
    };
    document.addEventListener('visibilitychange', onVis);
    const timer = window.setInterval(() => void loadNotifications(), REALTIME_FAST_POLL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.clearInterval(timer);
    };
  }, [isCustomer, location.pathname]);

  useEffect(() => {
    void api
      .get<PublicBranding>('/api/public/branding')
      .then((r) => setBranding(r.data))
      .catch(() => setBranding(defaultBranding));
  }, []);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    return () => {
      if (closeMenuTimerRef.current) {
        window.clearTimeout(closeMenuTimerRef.current);
      }
    };
  }, []);

  const openProfileMenu = () => {
    if (closeMenuTimerRef.current) {
      window.clearTimeout(closeMenuTimerRef.current);
      closeMenuTimerRef.current = null;
    }
    setIsProfileMenuOpen(true);
  };

  const scheduleCloseProfileMenu = () => {
    if (closeMenuTimerRef.current) {
      window.clearTimeout(closeMenuTimerRef.current);
    }
    closeMenuTimerRef.current = window.setTimeout(() => {
      setIsProfileMenuOpen(false);
      closeMenuTimerRef.current = null;
    }, 260);
  };

  const navLinks = [
    { name: 'TRANG CHỦ', path: '/' },
    { name: 'LỊCH TRÌNH', path: '/lich-trinh' },
    { name: 'TRA CỨU VÉ', path: '/tra-cuu-ve' },
    { name: 'LIÊN HỆ', path: '/lien-he' },
    { name: 'VỀ CHÚNG TÔI', path: '/ve-chung-toi' },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50">
      <header className="bg-[#ef5222] text-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link to="/" className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
                <img
                  src={branding.logoUrl && branding.logoUrl.trim() ? branding.logoUrl : logoImage}
                  alt="Vina Go"
                  className="h-10 w-auto object-contain"
                />
                <span className="font-extrabold text-2xl tracking-tight leading-none">
                  <span className="text-[#0e5a32]">Vina</span>
                  <span className="text-[#e32222]">Go</span>
                </span>
              </Link>
            </div>

            <nav className="hidden md:flex space-x-6 items-center">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-base font-semibold hover:text-gray-200 transition ${
                    location.pathname === link.path ? 'border-b-2 border-white pb-1' : ''
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center">
              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  {isAdmin ? (
                    <Link to="/admin/accounts" className="flex items-center bg-white text-[#ef5222] px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-100 transition max-w-[180px] truncate">
                      <User className="w-4 h-4 mr-2" />
                      Dashboard Admin
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      {isCustomer && (
                        <div ref={notifMenuRef} className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setIsNotifOpen((v) => !v);
                              void loadNotifications();
                            }}
                            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                            aria-label="Thông báo"
                          >
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[#ef5222]">
                                {unreadCount > 9 ? '9+' : unreadCount}
                              </span>
                            )}
                          </button>
                          {isNotifOpen && (
                            <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/10">
                              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                                <p className="text-sm font-semibold text-gray-800">Thông báo</p>
                                {unreadCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => void api.post('/api/me/notifications/read-all').then(() => loadNotifications())}
                                    className="text-xs font-semibold text-[#ef5222]"
                                  >
                                    Đánh dấu đã đọc
                                  </button>
                                )}
                              </div>
                              <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                  <p className="px-4 py-6 text-center text-sm text-gray-500">Chưa có thông báo.</p>
                                ) : (
                                  notifications.map((n) => (
                                    <button
                                      key={n.id}
                                      type="button"
                                      onClick={() => {
                                        void api.post(`/api/me/notifications/${n.id}/read`).then(() => {
                                          void loadNotifications();
                                          if (
                                            n.loai === 'DAT_TRUOC' ||
                                            n.loai === 'NHAC_THANH_TOAN' ||
                                            n.loai === 'HUY_VE' ||
                                            n.loai === 'TU_CHOI_HUY'
                                          ) {
                                            navigate('/tai-khoan/lich-su-mua-ve');
                                          }
                                        });
                                      }}
                                      className={`block w-full border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50 ${n.daDoc ? 'opacity-70' : 'bg-orange-50/40'}`}
                                    >
                                      <p className="text-sm font-semibold text-gray-800">{n.tieuDe}</p>
                                      <p className="mt-1 text-xs leading-relaxed text-gray-600">{n.noiDung}</p>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    <div
                      ref={profileMenuRef}
                      className="relative"
                      onMouseEnter={openProfileMenu}
                      onMouseLeave={scheduleCloseProfileMenu}
                    >
                      <button
                        type="button"
                        onClick={openProfileMenu}
                        className="flex items-center gap-2 bg-white text-[#ef5222] px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-100 transition max-w-[220px]"
                      >
                        <User className="w-4 h-4 shrink-0" />
                        <span className="truncate">{shortText(userName, 18)}</span>
                        <ChevronDown className="w-4 h-4 shrink-0" />
                      </button>
                      {isProfileMenuOpen && (
                        <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-md bg-white py-2 shadow-xl ring-1 ring-black/10 z-50">
                          <Link to="/tai-khoan/thong-tin" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                            <UserCircle2 className="w-5 h-5 text-[#e6a319]" />
                            Thông tin tài khoản
                          </Link>
                          <Link to="/tai-khoan/lich-su-mua-ve" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                            <History className="w-5 h-5 text-[#60a5fa]" />
                            Lịch sử mua vé
                          </Link>
                          <Link to="/tai-khoan/dat-lai-mat-khau" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                            <KeyRound className="w-5 h-5 text-[#f97316]" />
                            Đặt lại mật khẩu
                          </Link>
                          <button
                            type="button"
                            onClick={onLogout}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <LogOut className="w-5 h-5 text-[#ef4444]" />
                            Đăng xuất
                          </button>
                        </div>
                      )}
                    </div>
                    </div>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="flex items-center bg-white/10 border border-white/30 text-white px-3 py-2 rounded-full text-sm font-semibold hover:bg-white/20 transition"
                    >
                      Đăng xuất
                    </button>
                  )}
                </div>
              ) : (
                <Link to="/login" className="flex items-center bg-white text-[#ef5222] px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-100 transition">
                  <User className="w-4 h-4 mr-2" />
                  Đăng nhập/Đăng ký
                </Link>
              )}
            </div>

            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="md:hidden pb-4">
              <div className="flex flex-col space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="text-sm font-semibold hover:bg-[#d84a1e] px-2 py-2 rounded"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
                {!isLoggedIn ? (
                   <Link
                  to="/login"
                    className="flex items-center bg-white text-[#ef5222] px-4 py-2 rounded text-sm font-semibold w-max mt-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                   >
                     <User className="w-4 h-4 mr-2" />
                     Đăng nhập/Đăng ký
                   </Link>
                ) : (
                  <>
                    {!isAdmin && (
                      <>
                        <Link to="/tai-khoan/thong-tin" className="text-sm font-semibold hover:bg-[#d84a1e] px-2 py-2 rounded" onClick={() => setIsMobileMenuOpen(false)}>Thông tin tài khoản</Link>
                        <Link to="/tai-khoan/lich-su-mua-ve" className="text-sm font-semibold hover:bg-[#d84a1e] px-2 py-2 rounded" onClick={() => setIsMobileMenuOpen(false)}>Lịch sử mua vé</Link>
                        <Link to="/tai-khoan/dat-lai-mat-khau" className="text-sm font-semibold hover:bg-[#d84a1e] px-2 py-2 rounded" onClick={() => setIsMobileMenuOpen(false)}>Đặt lại mật khẩu</Link>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={onLogout}
                      className="flex items-center bg-white text-[#ef5222] px-4 py-2 rounded text-sm font-semibold w-max mt-2"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Đăng xuất
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow">
        <Outlet context={branding} />
      </main>

      <footer className="bg-[#fdf8f5] text-gray-800 pt-12 pb-0 border-t border-gray-200">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 text-base">
          <div>
            <h3 className="font-bold text-xl text-[#00613d] mb-4">TRUNG TÂM TỔNG ĐÀI & CSKH</h3>
            <p className="text-2xl font-bold text-[#ef5222] mb-4">1900 9999</p>
            <h4 className="font-bold text-lg mb-2 uppercase">CÔNG TY CỔ PHẦN VINA GO - VINA GO BUS LINES</h4>
            <p className="mb-2"><MapPin className="inline w-4 h-4 mr-1 text-[#ef5222]"/>Địa chỉ: 12 Nguyễn Văn Bảo, Phường Hạnh Thông, Quận Gò Vấp, TP. Hồ Chí Minh</p>
            <p className="mb-2"><Mail className="inline w-4 h-4 mr-1 text-[#ef5222]"/>Email: support.banvexe@gmail.com</p>
            <p className="mb-2"><Phone className="inline w-4 h-4 mr-1 text-[#ef5222]"/>Điện thoại: 02838386852</p>
          </div>
          <div>
            <h3 className="font-bold text-xl mb-4">Vina Go Bus Lines</h3>
            <ul className="space-y-2">
              <li><Link to="/lich-trinh" className="hover:text-[#ef5222]">Lịch trình</Link></li>
              <li><Link to="/tuyen-dung" className="hover:text-[#ef5222]">Tuyển dụng</Link></li>
              <li><Link to="/mang-luoi" className="hover:text-[#ef5222]">Mạng lưới văn phòng</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-xl mb-4">Hỗ trợ</h3>
            <ul className="space-y-2">
              <li><Link to="/huong-dan-dat-ve" className="hover:text-[#ef5222]">Hướng dẫn đặt vé trên web</Link></li>
              <li><Link to="/tra-cuu-ve" className="hover:text-[#ef5222]">Tra cứu thông tin đặt vé</Link></li>
              <li><Link to="/dieu-khoan" className="hover:text-[#ef5222]">Điều khoản sử dụng</Link></li>
              <li><Link to="/cau-hoi" className="hover:text-[#ef5222]">Câu hỏi thường gặp</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-xl mb-4">KẾT NỐI CHÚNG TÔI</h3>
            <div className="flex space-x-4 mb-6">
              <a href="#" className="text-white bg-blue-600 hover:opacity-80 px-3 py-1 rounded font-bold text-base">Facebook</a>
              <a href="#" className="text-white bg-red-600 hover:opacity-80 px-3 py-1 rounded font-bold text-base">YouTube</a>
            </div>
            <h3 className="font-bold text-xl mb-2">TẢI APP VINA GO</h3>
            <div className="flex space-x-2">
               <div className="bg-black text-white px-3 py-1 rounded flex items-center text-sm cursor-pointer">App Store</div>
               <div className="bg-green-600 text-white px-3 py-1 rounded flex items-center text-sm cursor-pointer">CH Play</div>
            </div>
          </div>
        </div>
        <div className="mt-8 bg-[#00613d] text-white text-center py-4 text-sm">
          <p>© 2025 | Bản quyền thuộc về Công ty Cổ Phần Vina Go - Vina Go Bus Lines</p>
        </div>
      </footer>

      <HelpBubble />
    </div>
  );
};

export default PublicLayout;