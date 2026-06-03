/**
 * Sơ đồ ghế & lọc hàng / tầng — đồng bộ với backend (BookingCatalogService.generateSeatLabels):
 * - Giường: A01.. tầng dưới, B01.. tầng trên
 * - Khác: 01, 02, ...
 */

export type SeatStatus = { maGhe: string; daBan: boolean; dangGiuCho?: boolean };

export function isSeatUnavailable(seat: SeatStatus): boolean {
  return seat.daBan || Boolean(seat.dangGiuCho);
}

/** API GET /api/catalog/trips/{id}/seats */
export type SeatMapResponse = { tongSoGhe: number; ghe: SeatStatus[] };

export type UiSeat = {
  maGhe: string;
  daBan: boolean;
  dangGiuCho?: boolean;
  hienThiGhe?: string;
};

export type SeatLayout = {
  tangDuoi?: UiSeat[][];
  tangTren?: UiSeat[][];
  single?: UiSeat[][];
  singleType?: 'limousine' | 'seat';
  /** Có 2 tầng (giường) — để ẩn bộ lọc tầng ở xe không có tầng trên */
  hasTwoDecks?: boolean;
};

const norm = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function getVehicleKind(vehicleType: string): 'sleeper' | 'limousine' | 'seat' {
  const vt = norm(vehicleType || '');
  if (vt.includes('giuong')) return 'sleeper';
  if (vt.includes('limousine') || vt.includes('limosine')) return 'limousine';
  return 'seat';
}

const pickSeat = (apiSeats: SeatStatus[], idx: number): UiSeat => {
  const s = apiSeats[idx];
  if (!s) return { maGhe: '', daBan: true, dangGiuCho: false };
  return { maGhe: s.maGhe, daBan: s.daBan, dangGiuCho: Boolean(s.dangGiuCho) };
};

const withHienThi = (ui: UiSeat, hienThiGhe: string): UiSeat => ({ ...ui, hienThiGhe });

/**
 * Tầng giường: hàng đầu 2 ghế, các hàng sau 3 ghế (2 + 3 + 3 + …) — cùng logic bản cũ trang chủ.
 */
function buildSleeperFloorRows(count: number, startIdx: number, apiSeats: SeatStatus[], prefix: 'A' | 'B'): UiSeat[][] {
  const rows: UiSeat[][] = [];
  if (count <= 0) return rows;
  const first = Math.min(2, count);
  rows.push(
    Array.from({ length: first }, (_, i) =>
      withHienThi(pickSeat(apiSeats, startIdx + i), `${prefix}${String(i + 1).padStart(2, '0')}`),
    ),
  );
  let used = first;
  while (used < count) {
    const rowSize = Math.min(3, count - used);
    rows.push(
      Array.from({ length: rowSize }, (_, i) =>
        withHienThi(pickSeat(apiSeats, startIdx + used + i), `${prefix}${String(used + i + 1).padStart(2, '0')}`),
      ),
    );
    used += rowSize;
  }
  return rows;
}

/**
 * Tầng dưới: A, tầng trên: B — thứ tự chỉ số bám API (nửa trước A, nửa sau B)
 */
export function buildSleeperLayout(apiSeats: SeatStatus[]): SeatLayout {
  const total = apiSeats.length;
  const lowerCount = Math.ceil(total / 2);
  const upperCount = total - lowerCount;
  return {
    hasTwoDecks: true,
    tangDuoi: buildSleeperFloorRows(lowerCount, 0, apiSeats, 'A'),
    tangTren: buildSleeperFloorRows(upperCount, lowerCount, apiSeats, 'B'),
  };
}

/**
 * Limousine: 2 ghế / hàng, hàng cuối có thể 1 hoặc 3 (11 chỗ: 4 hàng 2+2+2+2, hàng 5: 3 ghế)
 */
export function buildLimousineLayout(apiSeats: SeatStatus[]): SeatLayout {
  const total = apiSeats.length;
  const toLabel = (idx: number) => String(idx + 1).padStart(2, '0');
  const toSeat = (idx: number) => withHienThi(pickSeat(apiSeats, idx), toLabel(idx));
  const rows: UiSeat[][] = [];

  if (total === 11) {
    for (let i = 0; i < 8; i += 2) {
      rows.push([toSeat(i), toSeat(i + 1)]);
    }
    rows.push([toSeat(8), toSeat(9), toSeat(10)]);
  } else {
    for (let idx = 0; idx < total; idx += 2) {
      const row: UiSeat[] = [toSeat(idx)];
      if (idx + 1 < total) row.push(toSeat(idx + 1));
      rows.push(row);
    }
  }
  return { single: rows, singleType: 'limousine', hasTwoDecks: false };
}

/**
 * Xe ghế: 4 ghế / hàng, thứ tự 4|3|2|1 (lối đi ở giữa) giống thiết kế cũ
 */
export function buildSeatBusLayout(apiSeats: SeatStatus[]): SeatLayout {
  const total = apiSeats.length;
  const rows: UiSeat[][] = [];
  const rowCount = Math.ceil(total / 4);
  for (let row = 0; row < rowCount; row++) {
    const base = row * 4;
    const order = [3, 2, 1, 0];
    const rowSeats = order
      .map((offset) => {
        const idx = base + offset;
        if (idx >= total) return null;
        return withHienThi(pickSeat(apiSeats, idx), String(idx + 1).padStart(2, '0'));
      })
      .filter((s): s is UiSeat => Boolean(s));
    rows.push(rowSeats);
  }
  return { single: rows, singleType: 'seat', hasTwoDecks: false };
}

export function getSeatLayoutByVehicleType(vehicleType: string, apiSeats: SeatStatus[]): SeatLayout {
  const kind = getVehicleKind(vehicleType);
  if (kind === 'sleeper') return buildSleeperLayout(apiSeats);
  if (kind === 'limousine') return buildLimousineLayout(apiSeats);
  return buildSeatBusLayout(apiSeats);
}

export function collectHienThiByMaGhe(layout: SeatLayout): Map<string, string> {
  const m = new Map<string, string>();
  const visit = (rows?: UiSeat[][]) => {
    rows?.forEach((row) =>
      row.forEach((s) => {
        if (s.maGhe) m.set(s.maGhe, s.hienThiGhe ?? s.maGhe);
      }),
    );
  };
  visit(layout.tangDuoi);
  visit(layout.tangTren);
  visit(layout.single);
  return m;
}

export function displaySeatCodes(maGheList: string[], map: Map<string, string>): string {
  if (!maGheList.length) return 'Chưa chọn';
  return maGheList.map((c) => map.get(c) ?? c).join(', ');
}

// --- Bộ lọc hàng / tầng (theo mã chuẩn maGhe) ---

export type RowFilterState = { front: boolean; middle: boolean; back: boolean };
export type DeckFilterState = { top: boolean; bottom: boolean };

function parseSleeperPart(ma: string): { level: 'A' | 'B'; n: number } | null {
  const m = ma.trim().toUpperCase().match(/^([AB])(\d+)$/);
  if (!m) return null;
  return { level: m[1] as 'A' | 'B', n: parseInt(m[2], 10) };
}

function parseNumericCode(ma: string): number {
  const t = ma.trim();
  return parseInt(t.replace(/\D/g, ''), 10) || 0;
}

function bandSleeper(n: number, maxN: number): 'front' | 'middle' | 'back' {
  if (n >= 1 && n <= 5) return 'front';
  if (n >= 6 && n <= 11) return 'middle';
  if (n >= 12 && n <= maxN) return 'back';
  return n <= 5 ? 'front' : n <= 11 ? 'middle' : 'back';
}

function bandLimo(n: number, total: number): 'front' | 'middle' | 'back' {
  if (total === 11) {
    if (n >= 1 && n <= 4) return 'front';
    if (n >= 5 && n <= 8) return 'middle';
    if (n >= 9 && n <= 11) return 'back';
  }
  if (n <= total / 3) return 'front';
  if (n <= (2 * total) / 3) return 'middle';
  return 'back';
}

function bandSeat(n: number, total: number): 'front' | 'middle' | 'back' {
  if (total === 28) {
    if (n >= 1 && n <= 8) return 'front';
    if (n >= 9 && n <= 20) return 'middle';
    if (n >= 21 && n <= 28) return 'back';
  }
  if (n <= total / 3) return 'front';
  if (n <= (2 * total) / 3) return 'middle';
  return 'back';
}

/**
 * Có nên ẩn / làm mờ ghế vì không khớp bộ lọc? (khi mọi filter đều tắt → hiện tất cả)
 */
export function isSeatVisibleByFilters(
  maGhe: string,
  loaiXe: string,
  apiSeats: SeatStatus[],
  row: RowFilterState,
  deck: DeckFilterState,
): boolean {
  const hasRow = row.front || row.middle || row.back;
  const hasDeck = deck.top || deck.bottom;
  if (!hasRow && !hasDeck) return true;

  const kind = getVehicleKind(loaiXe);
  const total = apiSeats.length;
  const deckSleeper = hasDeck && kind === 'sleeper';

  if (kind === 'sleeper') {
    const p = parseSleeperPart(maGhe);
    if (!p) return false;

    const lowerN = Math.ceil(total / 2);
    const maxOnFloor = p.level === 'A' ? lowerN : total - lowerN;

    let rowOk = !hasRow;
    if (hasRow) {
      const b = bandSleeper(p.n, maxOnFloor);
      rowOk = (row.front && b === 'front') || (row.middle && b === 'middle') || (row.back && b === 'back');
    }

    let deckOk = !deckSleeper;
    if (deckSleeper) {
      if (deck.bottom && !deck.top) deckOk = p.level === 'A';
      else if (!deck.bottom && deck.top) deckOk = p.level === 'B';
      else deckOk = true;
    }
    return rowOk && deckOk;
  }

  const n = parseNumericCode(maGhe);
  if (n < 1) return !hasRow;

  let rowOk = !hasRow;
  if (hasRow) {
    const b = kind === 'limousine' ? bandLimo(n, total) : bandSeat(n, total);
    rowOk = (row.front && b === 'front') || (row.middle && b === 'middle') || (row.back && b === 'back');
  }

  return rowOk;
}

/**
 * Lọc danh sách chuyến: còn ít nhất một ghế trống khớp bộ lọc hàng/tầng.
 * Khi chưa có sơ đồ (chưa tải) → trả true để không ẩn sạch trước khi tải xong.
 */
export function tripHasAvailableSeatMatchingFilters(
  loaiXe: string,
  soDo: { ghe: SeatStatus[] } | null | undefined,
  row: RowFilterState,
  deck: DeckFilterState,
): boolean {
  const hasRow = row.front || row.middle || row.back;
  const hasDeck = deck.top || deck.bottom;
  if (!hasRow && !hasDeck) return true;
  if (!soDo?.ghe?.length) return true;
  for (const g of soDo.ghe) {
    if (isSeatUnavailable(g)) continue;
    if (isSeatVisibleByFilters(g.maGhe, loaiXe, soDo.ghe, row, deck)) return true;
  }
  return false;
}

export function gheHienThiTrenBang(maGheList: string[], soDo: { ghe: SeatStatus[] } | null, loaiXe: string): string {
  if (!maGheList.length) return '';
  if (!soDo) return maGheList.join(', ');
  const layout = getSeatLayoutByVehicleType(loaiXe, soDo.ghe);
  const m = collectHienThiByMaGhe(layout);
  return displaySeatCodes(maGheList, m);
}
