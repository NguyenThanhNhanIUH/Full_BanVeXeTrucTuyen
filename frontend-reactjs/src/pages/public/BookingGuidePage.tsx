import { Link } from 'react-router-dom';
import { Bus, CalendarCheck, CheckCircle2, CreditCard, MapPin, MousePointerClick, Search, Ticket, UserCircle } from 'lucide-react';

const steps = [
  { num: '01', title: 'Truy cập website', desc: 'Mở trang chủ Vina Go để bắt đầu đặt vé.' },
  { num: '02', title: 'Chọn thông tin hành trình', desc: 'Nhập điểm đi, điểm đến, ngày đi (và ngày về nếu khứ hồi), số lượng vé.' },
  { num: '03', title: 'Chọn chuyến và ghế', desc: 'Chọn chuyến phù hợp, mở sơ đồ ghế và chọn ghế theo nhu cầu.' },
  { num: '04', title: 'Nhập thông tin & thanh toán', desc: 'Điền họ tên, SĐT, email; xác nhận điều khoản rồi chuyển sang thanh toán.' },
  { num: '05', title: 'Hoàn tất đặt vé', desc: 'Xác nhận thanh toán, tra cứu vé bằng SĐT và mã vé.' },
];

const benefits = [
  'Chủ động chọn lịch trình, loại xe và ghế phù hợp.',
  'Đặt vé trực tuyến, hạn chế xếp hàng tại bến.',
  'Tích hợp tra cứu vé và theo dõi trạng thái sau khi thanh toán.',
  'Ưu tiên tài khoản thành viên: đăng nhập để đặt vé và quản lý vé nhanh hơn.',
];

const journeySubSteps = [
  'Chọn điểm khởi hành và điểm đến (có thể đảo chiều bằng nút ⇌).',
  'Chọn ngày đi; nếu khứ hồi, chọn thêm ngày về.',
  'Bấm Tìm chuyến xe để xem danh sách chuyến.',
  'Chọn chuyến, mở Chọn ghế để chọn vị trí; chọn đủ ghế theo từng chiều (nếu khứ hồi).',
  'Bấm Chọn chuyến / Chọn để sang trang đặt vé, kiểm tra thông tin và bấm Thanh toán.',
];

const BookingGuidePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff8f5] to-white pb-16">
      <div className="bg-gradient-to-r from-[#ff7a00] via-[#ef5222] to-[#df3b18] px-4 py-12 text-center text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/90">Hướng dẫn</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Hướng dẫn đặt vé trên website</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-white/90 md:text-base">
          Quy trình mua vé trực tuyến trên Vina Go được tối ưu để bạn thao tác nhanh, rõ ràng ở từng bước — tương tự trải nghiệm trên các hệ thống đặt vé xe phổ biến.
        </p>
      </div>

      <div className="container mx-auto max-w-4xl px-4">
        <section className="mt-10 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm md:p-8">
          <h2 className="flex items-center gap-2 text-xl font-bold text-[#00613d]">
            <CheckCircle2 className="h-6 w-6 text-[#ef5222]" />
            Những lợi ích khi đặt vé trực tuyến
          </h2>
          <ul className="mt-4 space-y-3 text-gray-700">
            {benefits.map((b) => (
              <li key={b} className="flex gap-2 text-sm leading-relaxed md:text-base">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ef5222]" />
                {b}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-center text-2xl font-bold text-[#00613d]">Các bước mua vé nhanh</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-gray-500">Năm bước từ lúc mở trang đến khi hoàn tất thanh toán.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-5">
            {steps.map((s) => (
              <div
                key={s.num}
                className="relative rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm transition hover:border-[#ef5222]/30 hover:shadow-md"
              >
                <span className="inline-block rounded-full bg-[#ef5222] px-2.5 py-0.5 text-xs font-bold text-white">{s.num}</span>
                <h3 className="mt-2 text-sm font-bold text-gray-900">{s.title}</h3>
                <p className="mt-1 text-left text-xs text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-xl font-bold text-[#00613d]">Chi tiết từng bước</h2>

          <div className="mt-6 space-y-8">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ef5222] text-lg font-bold text-white">1</div>
              <div>
                <h3 className="font-bold text-gray-900">Bước 1: Truy cập trang chủ</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Vào{' '}
                  <Link to="/" className="font-semibold text-[#ef5222] hover:underline">
                    Trang chủ
                  </Link>{' '}
                  Vina Go để bắt đầu tìm chuyến.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ef5222] text-lg font-bold text-white">2</div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">Bước 2: Chọn thông tin hành trình</h3>
                <p className="mt-1 text-sm text-gray-600">Tại form tìm chuyến, bạn có thể:</p>
                <ul className="mt-2 space-y-1.5 text-sm text-gray-700">
                  {journeySubSteps.map((t) => (
                    <li key={t} className="flex gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0e5a32]" />
                      {t}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-gray-500">
                  Xem thêm danh sách tuyến xe:{' '}
                  <Link to="/lich-trinh" className="font-semibold text-[#ef5222] hover:underline">
                    Lịch trình
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ef5222] text-lg font-bold text-white">3</div>
              <div>
                <h3 className="font-bold text-gray-900">Bước 3: Chọn ghế & thông tin hành khách</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Tại trang{' '}
                  <Link to="/" className="font-semibold text-[#ef5222] hover:underline">
                    Đặt vé
                  </Link>
                  , chọn ghế theo từng chuyến, nhập họ tên, số điện thoại, email; tick đồng ý điều khoản. Bạn cần{' '}
                  <span className="font-semibold">đăng nhập tài khoản khách</span> để hệ thống lưu vé.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ef5222] text-lg font-bold text-white">4</div>
              <div>
                <h3 className="font-bold text-gray-900">Bước 4: Thanh toán</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Sau khi bấm <strong>Thanh toán</strong> ở trang đặt vé, vé được lưu ở trạng thái chờ thanh toán, sau đó bạn chọn phương thức tại trang{' '}
                  <Link to="/thanh-toan" className="font-semibold text-[#ef5222] hover:underline">
                    Thanh toán
                  </Link>{' '}
                  và xác nhận thanh toán thành công.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0e5a32] text-lg font-bold text-white">5</div>
              <div>
                <h3 className="font-bold text-gray-900">Bước 5: Tra cứu vé</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Dùng{' '}
                  <Link to="/tra-cuu-ve" className="font-semibold text-[#ef5222] hover:underline">
                    Tra cứu vé
                  </Link>{' '}
                  với số điện thoại đã dùng khi đăng ký và mã vé để xem lại thông tin chuyến, ghế và trạng thái vé.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-[#f0faf5] p-4 text-sm text-gray-700">
          <span className="inline-flex items-center gap-1.5">
            <Search className="h-4 w-4 text-[#0e5a32]" />
            Tìm chuyến
          </span>
          <span className="text-gray-300">|</span>
          <span className="inline-flex items-center gap-1.5">
            <MousePointerClick className="h-4 w-4 text-[#0e5a32]" />
            Chọn chuyến
          </span>
          <span className="text-gray-300">|</span>
          <span className="inline-flex items-center gap-1.5">
            <Bus className="h-4 w-4 text-[#0e5a32]" />
            Chọn ghế
          </span>
          <span className="text-gray-300">|</span>
          <span className="inline-flex items-center gap-1.5">
            <UserCircle className="h-4 w-4 text-[#0e5a32]" />
            Thông tin KH
          </span>
          <span className="text-gray-300">|</span>
          <span className="inline-flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-[#0e5a32]" />
            Thanh toán
          </span>
          <span className="text-gray-300">|</span>
          <span className="inline-flex items-center gap-1.5">
            <Ticket className="h-4 w-4 text-[#0e5a32]" />
            Thành công
          </span>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-[#ef5222] px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#d84a1e]"
          >
            <CalendarCheck className="h-4 w-4" />
            Về trang chủ đặt vé
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookingGuidePage;
