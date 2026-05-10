import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import PublicLayout from './components/layout/PublicLayout';
import RequireAuth from './components/auth/RequireAuth';
import RequireAdmin from './components/auth/RequireAdmin';
import LoginPage from './pages/admin/LoginPage';
import AdminRoleHome from './pages/admin/AdminRoleHome';
import AccountManagement from './pages/admin/AccountManagement';
import CustomerAccountManagement from './pages/admin/CustomerAccountManagement';
import RouteManagement from './pages/admin/RouteManagement';
import TripManagement from './pages/admin/TripManagement';
import TicketManagement from './pages/admin/TicketManagement';
import RevenuePage from './pages/admin/RevenuePage';
import VehicleManagement from './pages/admin/VehicleManagement';
import CancelRequestsPage from './pages/admin/CancelRequestsPage';

// Public Pages
import HomePage from './pages/public/HomePage';
import SchedulePage from './pages/public/SchedulePage';
import TicketSearchPage from './pages/public/TicketSearchPage';
import AboutPage from './pages/public/AboutPage';
import ContactPage from './pages/public/ContactPage';
import BookingGuidePage from './pages/public/BookingGuidePage';
import BookingPage from './pages/public/BookingPage';
import PaymentPage from './pages/public/PaymentPage';
import PaymentResultPage from './pages/public/PaymentResultPage';
import CustomerProfilePage from './pages/public/CustomerProfilePage';
import CustomerTicketHistoryPage from './pages/public/CustomerTicketHistoryPage';
import CustomerChangePasswordPage from './pages/public/CustomerChangePasswordPage';

import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path='lich-trinh' element={<SchedulePage />} />
          <Route path='tra-cuu-ve' element={<TicketSearchPage />} />
          <Route path='dat-ve' element={<BookingPage />} />
          <Route path='thanh-toan' element={<PaymentPage />} />
          <Route path='thanh-toan/ket-qua' element={<PaymentResultPage />} />
          <Route path='ve-chung-toi' element={<AboutPage />} />
          <Route path='lien-he' element={<ContactPage />} />
          <Route path='huong-dan-dat-ve' element={<BookingGuidePage />} />
          <Route path='tai-khoan/thong-tin' element={<CustomerProfilePage />} />
          <Route path='tai-khoan/lich-su-mua-ve' element={<CustomerTicketHistoryPage />} />
          <Route path='tai-khoan/dat-lai-mat-khau' element={<CustomerChangePasswordPage />} />
        </Route>

        <Route path='/login' element={<LoginPage />} />
        <Route path='/admin/login' element={<Navigate to='/login' replace />} />

        <Route
          path='/admin'
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AdminRoleHome />} />
          <Route path='customers' element={<CustomerAccountManagement />} />
          <Route path='cancel-requests' element={<CancelRequestsPage />} />
          <Route
            path='accounts'
            element={
              <RequireAdmin>
                <AccountManagement />
              </RequireAdmin>
            }
          />
          <Route path='routes' element={<RouteManagement />} />
          <Route path='trips' element={<TripManagement />} />
          <Route path='tickets' element={<TicketManagement />} />
          <Route path='revenue' element={<RevenuePage />} />
          <Route
            path='vehicles'
            element={
              <RequireAdmin>
                <VehicleManagement />
              </RequireAdmin>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
