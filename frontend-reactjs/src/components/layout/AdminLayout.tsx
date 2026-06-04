import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Users, LogOut, Menu, Bell, Bus, MapPin, BusFront, Ticket, Truck, UserCircle2, Ban, BarChart3 } from 'lucide-react';
import { clearAuth, getStoredEmail, getStoredRole } from '../../auth/storage';
import { api } from '../../api/client';
import { REALTIME_POLL_MS } from '../../constants/realtimePoll';

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingCancelCount, setPendingCancelCount] = useState(0);
  const adminEmail = getStoredEmail() || 'quản trị';
  const role = getStoredRole();
  const isManager = role === 'QUAN_TRI';
  const isStaff = role === 'NHAN_VIEN';

  const navItems = useMemo(() => {
    const items: { name: string; path: string; icon: React.ReactNode; managerOnly?: boolean; badge?: number }[] = [
      { name: 'Quản lý tài khoản', path: '/admin/accounts', icon: <Users size={20} />, managerOnly: true },
      { name: 'Quản lý khách hàng', path: '/admin/customers', icon: <UserCircle2 size={20} /> },
      { name: 'Yêu cầu hủy vé', path: '/admin/cancel-requests', icon: <Ban size={20} /> },
      { name: 'Tuyến xe', path: '/admin/routes', icon: <MapPin size={20} /> },
      { name: 'Chuyến xe', path: '/admin/trips', icon: <BusFront size={20} /> },
      { name: 'Vé', path: '/admin/tickets', icon: <Ticket size={20} /> },
      { name: 'Doanh thu', path: '/admin/revenue', icon: <BarChart3 size={20} /> },
      { name: 'Quản lý xe', path: '/admin/vehicles', icon: <Truck size={20} />, managerOnly: true },
    ];
    if (isManager) {
      return items;
    }
    if (isStaff) {
      return items.filter((i) => !i.managerOnly);
    }
    return items;
  }, [isManager, isStaff]);

  useEffect(() => {
    let active = true;
    const loadPending = async () => {
      try {
        const res = await api.get<{ data?: number }>('/api/staff/booking/cancel-requests/pending-count');
        if (active) setPendingCancelCount(Number(res.data?.data) || 0);
      } catch {
        if (active) setPendingCancelCount(0);
      }
    };
    void loadPending();
    const timer = window.setInterval(() => void loadPending(), REALTIME_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [location.pathname]);

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const onLogout = () => {
    clearAuth();
    navigate('/', { replace: true });
  };

  const onBellClick = () => {
    navigate('/admin/cancel-requests');
  };

  return (
    <div className='flex h-screen bg-[#f8f9fa] flex-col'>
      <header className='bg-gradient-to-r from-[#ef5222] to-[#fd7e14] text-white shadow-md z-20 h-16 flex items-center justify-between px-4'>
        <div className='flex items-center gap-2 min-w-0 flex-1'>
          <button 
            type='button'
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className='p-1.5 rounded-md hover:bg-white/20 transition-colors focus:outline-none'
          >
            <Menu size={24} />
          </button>
          <div className='flex items-center gap-2 font-bold text-lg tracking-wide bg-white text-[#ef5222] px-4 py-1.5 rounded-full shadow-sm max-w-[260px]'>
            <Bus size={19} />
            <span className='truncate'>VinaGo Admin</span>
          </div>
        </div>

        <div className='flex items-center gap-4'>
          <button
            type='button'
            onClick={onBellClick}
            className='p-2 hover:bg-white/20 rounded-full transition-colors relative'
            aria-label={pendingCancelCount > 0 ? `${pendingCancelCount} yêu cầu hủy vé chờ duyệt` : 'Yêu cầu hủy vé'}
            title={pendingCancelCount > 0 ? `${pendingCancelCount} yêu cầu hủy vé chờ duyệt` : 'Yêu cầu hủy vé'}
          >
            <Bell size={20} />
            {pendingCancelCount > 0 && (
              <span className='absolute -top-0.5 -right-0.5 min-w-[18px] rounded-full bg-red-500 px-1 py-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-orange-500'>
                {pendingCancelCount > 99 ? '99+' : pendingCancelCount}
              </span>
            )}
          </button>
          <div className='flex items-center gap-3 px-3 py-1.5 rounded-lg border border-white/20'>
            <div className='w-8 h-8 bg-white text-[#ef5222] font-bold rounded-full flex items-center justify-center shadow-inner text-sm'>
              {adminEmail.charAt(0).toUpperCase()}
            </div>
            <div className='hidden md:block text-sm max-w-[220px] truncate'>
              <p className='font-semibold leading-none'>{isManager ? 'Quản trị' : isStaff ? 'Nhân viên' : 'VinaGo'}</p>
              <p className='text-xs text-white/80 lowercase mt-1 truncate' title={adminEmail}>
                {adminEmail}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className='flex flex-1 overflow-hidden'>
        <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-[#ef5222]/20 flex flex-col transition-all duration-300 z-10 shadow-sm`}>
          <nav className='flex-1 overflow-y-auto py-6 px-3 space-y-2'>
            {navItems.map((item) => {
              const isActive = isActivePath(item.path);
              const showBadge = item.path === '/admin/cancel-requests' && pendingCancelCount > 0;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-3.5 rounded-xl transition-all duration-200 border border-transparent ${
                    isActive
                      ? 'bg-[#fff0eb] text-[#ef5222] border-[#ffdbcf] shadow-sm font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-[#ef5222] hover:border-gray-100 font-medium'
                  }`}
                  title={sidebarOpen ? '' : item.name}
                >
                  <span className={`relative flex-shrink-0 ${isActive ? 'text-[#ef5222]' : 'text-gray-400'}`}>
                    {item.icon}
                    {showBadge && !sidebarOpen && (
                      <span className='absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white' />
                    )}
                  </span>
                  {sidebarOpen && (
                    <span className='ml-3 flex flex-1 items-center justify-between gap-2'>
                      <span>{item.name}</span>
                      {showBadge && (
                        <span className='rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white'>
                          {pendingCancelCount > 99 ? '99+' : pendingCancelCount}
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className='p-4 border-t border-gray-100'>
            <button
              type='button'
              onClick={onLogout}
              className='flex items-center justify-center w-full px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors font-medium'
            >
              <LogOut size={20} />
              {sidebarOpen && <span className='ml-3'>Đăng xuất</span>}
            </button>
          </div>
        </aside>

        <main className='flex-1 overflow-y-auto p-6 md:p-8 relative isolate'>
          <div
            className="pointer-events-none absolute top-[-10%] right-[-5%] z-0 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-[#fff0eb] to-transparent opacity-60"
            aria-hidden
          />
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
