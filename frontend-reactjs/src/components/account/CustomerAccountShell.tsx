import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserCircle2, History, KeyRound, LogOut } from 'lucide-react';
import { clearAuth } from '../../auth/storage';

type Props = {
  active: 'profile' | 'history' | 'password';
  title: string;
  subtitle: string;
  rightAction?: ReactNode;
  children: ReactNode;
};

const CustomerAccountShell = ({ active, title, subtitle, rightAction, children }: Props) => {
  const navigate = useNavigate();

  const onLogout = () => {
    clearAuth();
    navigate('/', { replace: true });
  };

  const itemClass = (isActive: boolean) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-base transition ${
      isActive ? 'bg-[#fff5f1] text-gray-900' : 'text-gray-800 hover:bg-gray-50'
    }`;

  return (
    <div className="min-h-[72vh] bg-[#f3f3f5] py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:flex-row">
        <aside className="w-full rounded-2xl border border-gray-200 bg-white p-4 lg:w-[260px] lg:shrink-0">
          <nav className="space-y-2">
            <Link to="/tai-khoan/thong-tin" className={itemClass(active === 'profile')}>
              <UserCircle2 className="h-5 w-5 text-[#e6a319]" />
              <span>Thông tin tài khoản</span>
            </Link>
            <Link to="/tai-khoan/lich-su-mua-ve" className={itemClass(active === 'history')}>
              <History className="h-5 w-5 text-[#60a5fa]" />
              <span>Lịch sử mua vé</span>
            </Link>
            <Link to="/tai-khoan/dat-lai-mat-khau" className={itemClass(active === 'password')}>
              <KeyRound className="h-5 w-5 text-[#f97316]" />
              <span>Đặt lại mật khẩu</span>
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-base text-gray-800 transition hover:bg-gray-50"
            >
              <LogOut className="h-5 w-5 text-[#ef4444]" />
              <span>Đăng xuất</span>
            </button>
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[36px] font-bold leading-tight text-[#151515]">{title}</h1>
              <p className="mt-1 text-base text-gray-500">{subtitle}</p>
            </div>
            {rightAction}
          </div>
          {children}
        </section>
      </div>
    </div>
  );
};

export default CustomerAccountShell;
