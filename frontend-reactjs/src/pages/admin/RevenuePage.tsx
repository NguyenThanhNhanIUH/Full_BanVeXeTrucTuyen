import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronDown, RefreshCw, Ticket, Wallet } from 'lucide-react';
import {
  Area,
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
  const [err, setErr] = useState<string | null>(null);
  const [monthOptions, setMonthOptions] = useState<MonthOption[]>([]);
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('');
  const [daily, setDaily] = useState<DailyReport | null>(null);

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

  useEffect(() => {
    void loadMonths();
  }, [loadMonths]);

  useEffect(() => {
    if (!selectedYearMonth) return;
    void loadDaily(selectedYearMonth);
  }, [selectedYearMonth, loadDaily]);

  const onRefresh = () => {
    void loadMonths();
    if (selectedYearMonth) void loadDaily(selectedYearMonth);
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

  const totalTickets = Number(daily?.totalTicketsSold) || 0;
  const totalRevenue = toNum(daily?.totalRevenue);
  const chartBusy = monthsLoading || dailyLoading;
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
              <strong className="text-gray-700">Theo ngày</strong> trong tháng bạn chọn (giờ Việt Nam). Chỉ vé{' '}
              <strong className="text-gray-700">đã thanh toán</strong> và <strong className="text-gray-700">hoàn thành chuyến</strong>.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRefresh()}
          disabled={chartBusy}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#ef5222]/30 hover:bg-[#fff8f5] disabled:opacity-60"
        >
          <RefreshCw size={16} className={chartBusy ? 'animate-spin' : ''} />
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
              <p className="mt-2 text-sm text-gray-500">Khớp với biểu đồ: vé đã thanh toán + hoàn thành trong tháng.</p>
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
              <p className="mt-2 text-sm text-gray-500">Tổng tiền các ngày trong tháng đã chọn.</p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#fff0eb] text-[#ef5222] ring-1 ring-[#ffdbcf]">
              <Wallet size={26} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenuePage;
