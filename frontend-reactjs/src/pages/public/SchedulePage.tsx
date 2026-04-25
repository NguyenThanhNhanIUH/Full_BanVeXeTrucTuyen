import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import axios from 'axios';

type RouteSummary = {
  id: number;
  tenTuyen: string;
  diemDi: string;
  diemDen: string;
  khoangCach?: number;
  thoiGianDuKienPhut?: number;
  giaVeCoBan?: number;
  trangThai?: string;
};

type TripSummary = {
  loaiXe?: string;
  thoiGianDuKienPhut?: number;
};

type RouteRow = RouteSummary & {
  loaiXe?: string;
  thoiGianHanhTrinhPhut?: number;
};

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value ?? 0);

const formatDuration = (minutes?: number) => {
  if (!minutes || minutes <= 0) return '--';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} giờ${m ? ` ${m} phút` : ''}`;
};

const SchedulePage = () => {
  const [diemDi, setDiemDi] = useState('');
  const [diemDen, setDiemDen] = useState('');
  const [goiYDiemDi, setGoiYDiemDi] = useState<string[]>([]);
  const [goiYDiemDen, setGoiYDiemDen] = useState<string[]>([]);
  const [danhSachTuyen, setDanhSachTuyen] = useState<RouteRow[]>([]);
  const [dangTai, setDangTai] = useState(false);
  const [thongBao, setThongBao] = useState('');

  useEffect(() => {
    if (!diemDi.trim()) {
      setGoiYDiemDi([]);
      return;
    }
    const timeoutId = window.setTimeout(async () => {
      try {
        const { data } = await axios.get<{ data?: string[] }>('/api/catalog/origins', {
          params: { keyword: diemDi.trim() },
        });
        setGoiYDiemDi(data?.data ?? []);
      } catch {
        setGoiYDiemDi([]);
      }
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [diemDi]);

  useEffect(() => {
    if (!diemDen.trim()) {
      setGoiYDiemDen([]);
      return;
    }
    const timeoutId = window.setTimeout(async () => {
      try {
        const { data } = await axios.get<{ data?: string[] }>('/api/catalog/destinations', {
          params: { keyword: diemDen.trim() },
        });
        setGoiYDiemDen(data?.data ?? []);
      } catch {
        setGoiYDiemDen([]);
      }
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [diemDen]);

  const searchRoutes = async (origin: string, destination: string) => {
    setDangTai(true);
    setThongBao('');
    try {
      const { data } = await axios.get<{ data?: RouteSummary[] }>('/api/catalog/routes', {
        params: {
          diemDi: origin.trim() || undefined,
          diemDen: destination.trim() || undefined,
        },
      });
      const routes = data?.data ?? [];
      const uniquePairs = Array.from(new Set(routes.map((r) => `${r.diemDi}|${r.diemDen}`)));
      const pairToTripInfo = new Map<string, { loaiXe?: string; thoiGianDuKienPhut?: number }>();
      await Promise.all(
        uniquePairs.map(async (pair) => {
          const [from, to] = pair.split('|');
          try {
            const tripRes = await axios.get<{ data?: TripSummary[] }>('/api/catalog/trips', {
              params: {
                diemDi: from,
                diemDen: to,
                soLuongVeToiThieu: 1,
              },
            });
            const firstTrip = (tripRes.data?.data ?? [])[0];
            if (firstTrip) {
              pairToTripInfo.set(pair, {
                loaiXe: firstTrip.loaiXe,
                thoiGianDuKienPhut: firstTrip.thoiGianDuKienPhut,
              });
            }
          } catch {
            // keep route-only data when trips cannot be loaded
          }
        }),
      );
      const rows: RouteRow[] = routes.map((r) => {
        const pair = `${r.diemDi}|${r.diemDen}`;
        const tripInfo = pairToTripInfo.get(pair);
        return {
          ...r,
          loaiXe: tripInfo?.loaiXe,
          thoiGianHanhTrinhPhut: r.thoiGianDuKienPhut ?? tripInfo?.thoiGianDuKienPhut,
        };
      });
      setDanhSachTuyen(rows);
      if (!routes.length) setThongBao('Không tìm thấy tuyến phù hợp.');
    } catch {
      setDanhSachTuyen([]);
      setThongBao('Không thể tải danh sách tuyến. Vui lòng thử lại.');
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    void searchRoutes('', '');
  }, []);

  const onSwapPlaces = () => {
    const nextDiemDi = diemDen;
    const nextDiemDen = diemDi;
    setDiemDi(nextDiemDi);
    setDiemDen(nextDiemDen);
    setGoiYDiemDi([]);
    setGoiYDiemDen([]);
  };

  const onSearch = () => {
    void searchRoutes(diemDi, diemDen);
  };

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-[#fff8f5] to-white py-10">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-8 rounded-3xl bg-white/90 p-6 shadow-lg shadow-orange-100/60 ring-1 ring-[#ef5222]/10 backdrop-blur">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#ef5222]">Lịch trình</p>
              <h2 className="text-2xl font-bold text-[#00613d] md:text-3xl">Tra cứu tuyến xe theo điểm đi và điểm đến</h2>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[#fdf8f5] p-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={diemDi}
                onChange={(e) => setDiemDi(e.target.value)}
                placeholder="Nhập điểm đi"
                className="w-full rounded-xl border border-white bg-white/95 py-3 pl-10 pr-3 shadow-sm outline-none transition focus:border-[#ef5222] focus:ring-2 focus:ring-[#ef5222]/15"
              />
              {goiYDiemDi.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                  {goiYDiemDi.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setDiemDi(item);
                        setGoiYDiemDi([]);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-[#fff7f3]"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onSwapPlaces}
              className="flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-500 shadow-sm transition hover:text-[#ef5222]"
              title="Đảo điểm đi và điểm đến"
            >
              ⇌
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={diemDen}
                onChange={(e) => setDiemDen(e.target.value)}
                placeholder="Nhập điểm đến"
                className="w-full rounded-xl border border-white bg-white/95 py-3 pl-10 pr-3 shadow-sm outline-none transition focus:border-[#ef5222] focus:ring-2 focus:ring-[#ef5222]/15"
              />
              {goiYDiemDen.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                  {goiYDiemDen.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setDiemDen(item);
                        setGoiYDiemDen([]);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-[#fff7f3]"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onSearch}
              className="rounded-xl bg-[#ef5222] px-6 py-3 font-semibold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-[#d84a1e]"
            >
              Tìm chuyến
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-gray-200/60 ring-1 ring-gray-100">
          <div className="border-b border-gray-100 bg-gradient-to-r from-[#00613d] to-[#0e7a4d] px-6 py-4 text-white">
            <h3 className="text-lg font-semibold">Danh sách tuyến</h3>
            <p className="text-sm text-white/80">Kết quả được lấy từ cơ sở dữ liệu.</p>
          </div>
          {dangTai && <p className="px-6 py-4 text-sm text-gray-500">Đang tải dữ liệu...</p>}
          {!dangTai && thongBao && <p className="px-6 py-4 text-sm text-amber-700">{thongBao}</p>}
          {!dangTai && !thongBao && (
            <table className="w-full border-collapse">
              <thead className="bg-[#f8faf8] text-left text-gray-700">
                <tr>
                  <th className="px-6 py-4 font-semibold">Tuyến xe</th>
                  <th className="px-6 py-4 font-semibold">Loại xe</th>
                  <th className="px-6 py-4 font-semibold">Quãng đường</th>
                  <th className="px-6 py-4 font-semibold">Thời gian hành trình</th>
                  <th className="px-6 py-4 font-semibold">Giá vé</th>
                </tr>
              </thead>
              <tbody>
                {danhSachTuyen.map((route) => (
                  <tr key={route.id} className="cursor-pointer border-b border-gray-100/80 transition hover:bg-[#fff8f5]">
                    <td className="px-6 py-4 font-semibold text-[#ef5222]">
                      {route.tenTuyen || `${route.diemDi} - ${route.diemDen}`}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{route.loaiXe || '--'}</td>
                    <td className="px-6 py-4 text-gray-600">{route.khoangCach ? `${route.khoangCach} km` : '--'}</td>
                    <td className="px-6 py-4 text-gray-600">{formatDuration(route.thoiGianHanhTrinhPhut)}</td>
                    <td className="px-6 py-4 font-bold text-[#00613d]">{formatCurrency(route.giaVeCoBan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;