export type TripSummary = {
  id: number;
  tenTuyen: string;
  diemDi: string;
  diemDen: string;
  ngayDi: string;
  gioDi: string;
  gioDenDuKien?: string;
  thoiGianDuKienPhut?: number;
  khoangCach?: number;
  giaVe: number;
  loaiXe: string;
  bienSo?: string;
  soGheTrong: number;
};

export type RouteSummary = {
  tenTuyen: string;
  diemDi: string;
  diemDen: string;
  thoiGianDuKien?: number;
};

export type SearchCriteria = {
  diemDi: string;
  diemDen: string;
  ngayDi: string;
  ngayVe: string;
  soVe: string;
  tripType: 'one-way' | 'round-trip';
};

export type SelectedTripInfo = {
  id: number;
  tenTuyen: string;
  diemDi: string;
  diemDen: string;
  ngayDi: string;
  gioDi: string;
  gioDenDuKien?: string;
  thoiGianDuKienPhut?: number;
  khoangCach?: number;
};

export type TimeFilterKey = 'early' | 'morning' | 'afternoon' | 'evening';
export type VehicleFilterKey = 'ghe' | 'giuong' | 'limousine';
export type ResultTab = 'outbound' | 'return';

export type HomeRestoreState = {
  search: SearchCriteria;
  outboundTrips: TripSummary[];
  returnTrips: TripSummary[];
  activeResultTab: ResultTab;
  chuyenDiDaChon: TripSummary | null;
  chuyenVeDaChon: TripSummary | null;
  chuyenChonDauTien: TripSummary | null;
  gheDangChonTheoChuyen: Record<number, string[]>;
  tripIdsDaMoChonGhe: number[];
  tripDangNoiBatId: number | null;
  focusTripId?: number | null;
};
