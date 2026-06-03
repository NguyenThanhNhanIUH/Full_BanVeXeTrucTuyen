import { formatDuration } from './homeFormatters';
import type { TripSummary } from './homeTypes';

/** Đồng bộ với hotline footer / branding app */
export const VINAGO_HOTLINE = '1900 9999';
export const VINAGO_SUPPORT_EMAIL = 'hotro@vinago.vn';

const formatNgayVn = (ngayIso?: string) => {
  if (!ngayIso) return '—';
  const [y, m, d] = ngayIso.split('-');
  if (!y || !m || !d) return ngayIso;
  return `${d}/${m}/${y}`;
};

const bulletList = (items: string[]) => (
  <ul className="mt-2 list-none space-y-2 text-sm leading-relaxed text-gray-700">
    {items.map((t) => (
      <li key={t.slice(0, 40)} className="flex gap-2">
        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-400" aria-hidden />
        <span>{t}</span>
      </li>
    ))}
  </ul>
);

export const TripSchedulePanel = ({ trip, gioDenHienThi }: { trip: TripSummary; gioDenHienThi: string }) => (
  <div className="rounded-xl bg-gray-50/80 px-4 py-4 text-gray-800">
    <p className="text-sm font-bold text-gray-900">Lịch trình chuyến</p>
    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tuyến</p>
        <p className="mt-0.5 font-semibold">{trip.tenTuyen}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ngày chạy</p>
        <p className="mt-0.5 font-semibold">{formatNgayVn(trip.ngayDi)}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Giờ xuất bến</p>
        <p className="mt-0.5 font-semibold">{trip.gioDi?.slice(0, 5) || '—'}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dự kiến đến</p>
        <p className="mt-0.5 font-semibold">{gioDenHienThi?.slice(0, 5) || '—'}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Điểm đi</p>
        <p className="mt-0.5">{trip.diemDi}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Điểm đến</p>
        <p className="mt-0.5">{trip.diemDen}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Loại xe</p>
        <p className="mt-0.5 font-semibold">{trip.loaiXe || '—'}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Biển số xe</p>
        <p className="mt-0.5 font-semibold font-mono">{trip.bienSo || '—'}</p>
      </div>
      <div className="sm:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Thời gian & quãng đường</p>
        <p className="mt-0.5">
          {formatDuration(trip.thoiGianDuKienPhut)}
          {trip.khoangCach != null ? ` — ${trip.khoangCach} km` : ''}
          <span className="text-gray-500"> (ước tính, có thể thay đổi theo giao thông)</span>
        </p>
      </div>
    </div>
  </div>
);

export const TripTransferPanel = () => (
  <div className="rounded-xl bg-gray-50/80 px-4 py-4 text-gray-800">
    <p className="text-sm font-bold text-gray-900">Đón / trả khách (VinaGo Buslines)</p>
    <p className="mt-1 text-xs text-gray-500">
      Một số tuyến hỗ trợ xe trung chuyển hoặc điểm đón cố định. Chi tiết điểm đón cụ thể sẽ được xác nhận qua tin nhắn / email sau khi đặt vé thành công.
    </p>
    {bulletList([
      `Đặt vé sớm: khuyến nghị đặt trước giờ khởi hành ít nhất vài giờ để bố trí đón phù hợp (đối với ngày lễ, cao điểm nên chủ động sớm hơn).`,
      `Thời gian xe trung chuyển: trong khu vực nội thành có thể kết hợp nhiều điểm, tài xế / điều hành sẽ liên hệ hẹn giờ gần giờ chạy.`,
      `Hẻm nhỏ, đường một chiều: xe có thể đón tại đầu hẻm / điểm tập trung gần nhất để đảm bảo an toàn.`,
      `Khu vực cấm dừng đỗ: đón tại vị trí hợp lệ gần nhất theo hướng dẫn của nhân viên.`,
      `Hành lý: mang theo hành lý gọn nhẹ; không vận chuyển động vật sống, hàng hóa cấm, đồ dễ gây mùi hoặc chảy nước trên xe.`,
    ])}
  </div>
);

export const TripPolicyPanel = () => (
  <div className="space-y-5 text-gray-800">
    <div className="rounded-xl bg-gray-50/80 px-4 py-4">
      <p className="text-sm font-bold text-gray-900">Chính sách hủy / đổi vé</p>
      {bulletList([
        'Vé đặt online qua VinaGo: mỗi mã vé chỉ hỗ trợ đổi thông tin / hủy theo điều kiện đang áp dụng tại thời điểm đặt (chi tiết hiển thị khi thanh toán).',
        'Phí hủy hoặc đổi (nếu có) phụ thuộc thời điểm bạn gửi yêu cầu so với giờ khởi hành và số lượng vé; mức cụ thể do hệ thống / nhân viên xác nhận theo quy định nội bộ và chính sách từng đợt khuyến mãi.',
        `Muốn hủy vé chờ thanh toán hoặc gửi yêu cầu hỗ trợ sau khi đã thanh toán, vui lòng liên hệ tổng đài ${VINAGO_HOTLINE}, email ${VINAGO_SUPPORT_EMAIL} hoặc làm theo hướng dẫn trong email xác nhận vé — nên liên hệ sớm trước giờ chạy để được hỗ trợ tốt nhất.`,
      ])}
    </div>
    <div className="rounded-xl bg-gray-50/80 px-4 py-4">
      <p className="text-sm font-bold text-gray-900">Yêu cầu khi lên xe</p>
      {bulletList([
        'Có mặt tại bến / điểm đón ghi trên vé trước ít nhất 15–30 phút để làm thủ tục; ngày lễ tết nên chủ động sớm hơn.',
        'Chuẩn bị mã vé (SMS, email) hoặc giấy tờ tùy thân theo yêu cầu của nhân viên soát vé.',
        'Không mang đồ ăn, đồ uống có mùi nồng; không hút thuốc, không vứt rác trên xe.',
        'Tuân thủ hướng dẫn an toàn của tài xế và nhân viên phục vụ.',
      ])}
    </div>
  </div>
);
