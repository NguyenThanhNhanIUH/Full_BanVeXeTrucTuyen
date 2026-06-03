/** Lọc danh sách + ô thống kê (không có «Hoàn thành» — vé đó xem ở «Tất cả») */
export const TICKET_LIST_STATUSES = [
  'ALL',
  'CHO_THANH_TOAN',
  'DAT_TRUOC',
  'DA_THANH_TOAN',
  'DANG_XU_LY',
  'DA_HUY',
] as const;

/** Trạng thái chọn trong form sửa vé */
export const TICKET_EDIT_STATUSES = [
  'CHO_THANH_TOAN',
  'DAT_TRUOC',
  'DA_THANH_TOAN',
  'DANG_XU_LY',
  'DA_HUY',
  'HOAN_THANH',
] as const;

export const STATUS_LABEL: Record<string, string> = {
  CHO_THANH_TOAN: 'Chờ thanh toán',
  DAT_TRUOC: 'Đặt trước',
  DA_THANH_TOAN: 'Đã thanh toán',
  DANG_XU_LY: 'Đang xử lý',
  DA_HUY: 'Đã hủy',
  HOAN_THANH: 'Hoàn thành',
};
