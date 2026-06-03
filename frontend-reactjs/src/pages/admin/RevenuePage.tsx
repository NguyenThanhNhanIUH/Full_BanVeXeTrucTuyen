import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronDown, MapPin, RefreshCw, Ticket, Wallet } from 'lucide-react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../api/client';

type MonthOption = {
  yearMonth?: string;
  label?: string;
};

type DailyRow = {
  dayOfMonth?: number;
  dateKey?: string;
  label?: string;
  ticketCount?: number;
  revenue?: number | string;
};

type DailyReport = {
  yearMonth?: string;
  monthLabel?: string;
  days?: DailyRow[];
  totalTicketsSold?: number;
  totalRevenue?: number | string;
};

type RouteRow = {
  routeId?: number;
  tenTuyen?: string;
  diemDi?: string;
  diemDen?: string;
  shortLabel?: string;
  ticketCount?: number;
  revenue?: number | string;
  revenueSharePercent?: number;
};

type RouteReport = {
  yearMonth?: string;
  monthLabel?: string;
  routes?: RouteRow[];
  totalTicketsSold?: number;
  totalRevenue?: number | string;
};

const formatVnd = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? Math.round(n) : 0,
  );

const toNum = (v: unknown): number => {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const x = Number(v);
    return Number.isNaN(x) ? 0 : x;
  }
  return 0;
};

function currentYearMonthLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

const RevenuePage: React.FC = () => {
  const [monthsLoading, setMonthsLoading] = useState(true);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [monthOptions, setMonthOptions] = useState<MonthOption[]>([]);
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('');
  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [byRoute, setByRoute] = useState<RouteReport | null>(null);

  const loadMonths = useCallback(async () => {
    setMonthsLoading(true);
    setErr(null);
    try {
      const res = await api.get<{ data?: MonthOption[] }>('/api/manager/revenue/months');
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setMonthOptions(list);
      setSelectedYearMonth((prev) => {
        if (prev && list.some((m) => m.yearMonth === prev)) return prev;
        if (list.length > 0 && list[0]?.yearMonth) return String(list[0].yearMonth);
        return currentYearMonthLocal();
      });
    } catch (e) {
      console.error(e);
      setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Không tải được danh sách tháng.');
      setMonthOptions([]);
      setSelectedYearMonth(currentYearMonthLocal());
    } finally {
      setMonthsLoading(false);
    }
  }, []);

  const loadDaily = useCallback(async (yearMonth: string) => {
    if (!yearMonth) return;
    setDailyLoading(true);
    setErr(null);
    try {
      const res = await api.get<{ data?: DailyReport }>('/api/manager/revenue/daily', {
        params: { yearMonth },
      });
      setDaily(res.data?.data ?? null);
    } catch (e) {
      console.error(e);
      setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Không tải được dữ liệu theo ngày.');
      setDaily(null);
    } finally {
      setDailyLoading(false);
    }
  }, []);

  const loadByRoute = useCallback(async (yearMonth: string) => {
    if (!yearMonth) return;
    setRouteLoading(true);
    try {
      const res = await api.get<{ data?: RouteReport }>('/api/manager/revenue/by-route', {
        params: { yearMonth },
      });
      setByRoute(res.data?.data ?? null);
    } catch (e) {
      console.error(e);
      setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Không tải được doanh thu theo tuyến.');
      setByRoute(null);
    } finally {
      setRouteLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMonths();
  }, [loadMonths]);

  useEffect(() => {
    if (!selectedYearMonth) return;
    void loadDaily(selectedYearMonth);
    void loadByRoute(selectedYearMonth);
  }, [selectedYearMonth, loadDaily, loadByRoute]);

  const onRefresh = () => {
    void loadMonths();
    if (selectedYearMonth) {
      void loadDaily(selectedYearMonth);
      void loadByRoute(selectedYearMonth);
    }
  };

  const chartData = useMemo(() => {
    const days = daily?.days ?? [];
    return days.map((d) => ({
      label: d.label || String(d.dayOfMonth ?? ''),
      revenue: toNum(d.revenue),
      tickets: Number(d.ticketCount) || 0,
      dateKey: d.dateKey || '',
    }));
  }, [daily]);

  const routeRows = useMemo(() => {
    const routes = byRoute?.routes ?? [];
    return routes.map((r) => ({
      routeId: r.routeId,
      tenTuyen: r.tenTuyen || '',
      diemDi: r.diemDi || '',
      diemDen: r.diemDen || '',
      shortLabel: r.shortLabel || r.tenTuyen || `${r.diemDi} → ${r.diemDen}`,
      ticketCount: Number(r.ticketCount) || 0,
      revenue: toNum(r.revenue),
      share: Number(r.revenueSharePercent) || 0,
    }));
  }, [byRoute]);

  const routeChartData = useMemo(() => routeRows.slice(0, 8), [routeRows]);

  const totalTickets = Number(daily?.totalTicketsSold) || 0;
  const totalRevenue = toNum(daily?.totalRevenue);
  const chartBusy = monthsLoading || dailyLoading;
  const routeBusy = monthsLoading || routeLoading;
  const hasAnyMonthOption = monthOptions.length > 0;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ef5222] to-[#fd7e14] text-white shadow-lg shadow-orange-200/50">
            <BarChart3 size={22} strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Doanh thu</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              <strong className="text-gray-700">Theo ngày</strong> và <strong className="text-gray-700">theo tuyến</strong> trong tháng bạn chọn (giờ Việt Nam). Chỉ vé{' '}
              <strong className="text-gray-700">đã thanh toán</strong> và <strong className="text-gray-700">hoàn thành chuyến</strong>.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRefresh()}
          disabled={chartBusy || routeBusy}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#ef5222]/30 hover:bg-[#fff8f5] disabled:opacity-60"
        >
          <RefreshCw size={16} className={chartBusy || routeBusy ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {err}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-[#ef5222]/15 bg-white shadow-xl shadow-orange-100/40 ring-1 ring-black/[0.03]">
        <div className="flex flex-col gap-4 border-b border-gray-100 bg-gradient-to-r from-[#fff8f5] via-white to-[#f0faf5] px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ef5222]">Biểu đồ</p>
            <h2 className="mt-1 text-lg font-bold text-gray-800">Doanh thu theo ngày</h2>
            {daily?.monthLabel && (
              <p className="mt-0.5 text-sm text-gray-500">
                Đang xem: <span className="font-semibold text-gray-700">{daily.monthLabel}</span>
              </p>
            )}
          </div>
          <div className="relative w-full sm:w-72">
            <label htmlFor="revenue-month" className="sr-only">
              Chọn tháng
            </label>
            <select
              id="revenue-month"
              value={selectedYearMonth}
              onChange={(e) => setSelectedYearMonth(e.target.value)}
              disabled={monthsLoading}
              className="w-full appearance-none rounded-2xl border border-[#ef5222]/25 bg-white py-3 pl-4 pr-11 text-sm font-semibold text-gray-800 shadow-sm outline-none transition focus:border-[#ef5222] focus:ring-2 focus:ring-[#ef5222]/20 disabled:opacity-60"
            >
              {!hasAnyMonthOption && (
                <option value={selectedYearMonth}>{selectedYearMonth} (chưa có vé — xem lưới ngày)</option>
              )}
              {monthOptions.map((m) => (
                <option key={m.yearMonth} value={m.yearMonth}>
                  {m.label || m.yearMonth}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#ef5222]/70"
              aria-hidden
            />
          </div>
        </div>
        <div className="p-4 sm:p-7">
          {chartBusy ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-gray-500">Đang tải dữ liệu…</div>
          ) : chartData.length === 0 ? (
            <div className="flex h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 text-center">
              <BarChart3 className="text-gray-300" size={40} />
              <p className="text-sm font-medium text-gray-600">Không có dữ liệu ngày trong tháng này</p>
            </div>
          ) : (
            <div className="h-[min(420px,55vh)] w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fd7e14" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#ef5222" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(v) => (v >= 1_000_000 ? `${Math.round(v / 1_000_000)}tr` : `${Math.round(v / 1000)}k`)}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0]?.payload as { label?: string; revenue?: number; tickets?: number; dateKey?: string };
                      return (
                        <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg">
                          <p className="text-xs font-semibold text-gray-500">
                            Ngày {p.label}
                            {p.dateKey ? <span className="text-gray-400"> · {p.dateKey}</span> : null}
                          </p>
                          <p className="text-sm font-bold text-[#ef5222]">{formatVnd(Number(p.revenue) || 0)}</p>
                          <p className="text-xs text-gray-600">{p.tickets ?? 0} vé</p>
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="none" fill="url(#revArea)" />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#ef5222"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#fff', stroke: '#ef5222', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: '#ef5222' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-6 shadow-md shadow-emerald-100/30 transition hover:shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-100/60 blur-2xl transition group-hover:bg-emerald-100" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/90">Tổng vé (tháng đang chọn)</p>
              <p className="mt-2 text-4xl font-extrabold tabular-nums text-gray-900">
                {chartBusy ? '…' : totalTickets.toLocaleString('vi-VN')}
              </p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <Ticket size={26} />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-orange-100 bg-white p-6 shadow-md shadow-orange-100/40 transition hover:shadow-lg">
          <div className="pointer-events-none absolute -right-10 top-10 h-32 w-32 rounded-full bg-orange-100/50 blur-2xl transition group-hover:bg-orange-100/70" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#c2410c]">Tổng doanh thu (tháng đang chọn)</p>
              <p className="mt-2 break-words text-3xl font-extrabold tabular-nums text-gray-900 sm:text-4xl">
                {chartBusy ? '…' : formatVnd(totalRevenue)}
              </p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#fff0eb] text-[#ef5222] ring-1 ring-[#ffdbcf]">
              <Wallet size={26} />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#00613d]/15 bg-white shadow-xl shadow-emerald-100/30 ring-1 ring-black/[0.03]">
        <div className="border-b border-gray-100 bg-gradient-to-r from-[#f0faf5] via-white to-[#fff8f5] px-5 py-4 sm:px-7">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00613d]/10 text-[#00613d]">
              <MapPin size={20} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00613d]">Theo tuyến</p>
              <h2 className="mt-1 text-lg font-bold text-gray-800">Top tuyến theo doanh thu</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Gom vé đã thanh toán theo <strong className="font-semibold text-gray-700">tuyến xe</strong>
                {byRoute?.monthLabel ? (
                  <>
                    {' '}
                    · <span className="font-semibold text-gray-700">{byRoute.monthLabel}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-0 xl:grid-cols-5">
          <div className="border-b border-gray-100 p-4 sm:p-7 xl:col-span-2 xl:border-b-0 xl:border-r">
            {routeBusy ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">Đang tải theo tuyến…</div>
            ) : routeChartData.length === 0 ? (
              <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 text-center">
                <MapPin className="text-gray-300" size={36} />
                <p className="text-sm font-medium text-gray-600">Chưa có doanh thu theo tuyến trong tháng này</p>
              </div>
            ) : (
              <div className="h-[min(360px,50vh)] w-full min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={routeChartData} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => (v >= 1_000_000 ? `${Math.round(v / 1_000_000)}tr` : `${Math.round(v / 1000)}k`)}
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="shortLabel"
                      width={108}
                      tick={{ fill: '#4b5563', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0]?.payload as {
                          tenTuyen?: string;
                          diemDi?: string;
                          diemDen?: string;
                          revenue?: number;
                          ticketCount?: number;
                          share?: number;
                        };
                        return (
                          <div className="max-w-xs rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg">
                            <p className="text-sm font-semibold text-gray-800">{p.tenTuyen || `${p.diemDi} → ${p.diemDen}`}</p>
                            <p className="text-sm font-bold text-[#00613d]">{formatVnd(Number(p.revenue) || 0)}</p>
                            <p className="text-xs text-gray-600">
                              {p.ticketCount ?? 0} vé · {(p.share ?? 0).toFixed(1)}%
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="revenue" fill="#00613d" radius={[0, 6, 6, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="overflow-x-auto p-4 sm:p-7 xl:col-span-3">
            {routeBusy ? (
              <div className="py-10 text-center text-sm text-gray-500">Đang tải bảng tuyến…</div>
            ) : routeRows.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">Không có dữ liệu tuyến trong tháng đang chọn.</div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                    <th className="pb-3 pr-4 font-semibold">#</th>
                    <th className="pb-3 pr-4 font-semibold">Tuyến</th>
                    <th className="pb-3 pr-4 font-semibold text-right">Vé</th>
                    <th className="pb-3 pr-4 font-semibold text-right">Doanh thu</th>
                    <th className="pb-3 font-semibold text-right">Tỷ lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {routeRows.map((row, idx) => (
                    <tr key={row.routeId ?? idx} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4 tabular-nums text-gray-400">{idx + 1}</td>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-gray-800">{row.tenTuyen || `${row.diemDi} → ${row.diemDen}`}</p>
                        <p className="text-xs text-gray-500">
                          {row.diemDi} → {row.diemDen}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums font-medium text-gray-700">
                        {row.ticketCount.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums font-semibold text-[#00613d]">
                        {formatVnd(row.revenue)}
                      </td>
                      <td className="py-3 text-right tabular-nums text-gray-600">{row.share.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenuePage;
