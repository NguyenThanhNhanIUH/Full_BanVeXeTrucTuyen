import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, RefreshCw, Ticket, Wallet } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../api/client';

type MonthlyRow = {
  year?: number;
  month?: number;
  yearMonth?: string;
  label?: string;
  ticketCount?: number;
  revenue?: number | string;
};

type RevenueReport = {
  months?: MonthlyRow[];
  totalTicketsSold?: number;
  totalRevenue?: number | string;
};

type ApiBody = { data?: RevenueReport };

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

const RevenuePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<RevenueReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<ApiBody>('/api/manager/revenue/report');
      setReport(res.data?.data ?? null);
    } catch (e) {
      console.error(e);
      setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Không tải được báo cáo doanh thu.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = useMemo(() => {
    const months = report?.months ?? [];
    return months.map((m) => ({
      label: m.label || m.yearMonth || '',
      revenue: toNum(m.revenue),
      tickets: Number(m.ticketCount) || 0,
    }));
  }, [report]);

  const totalTickets = Number(report?.totalTicketsSold) || 0;
  const totalRevenue = toNum(report?.totalRevenue);

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
              Theo tháng (múi giờ Việt Nam), chỉ tính vé <strong className="text-gray-700">đã thanh toán</strong> và{' '}
              <strong className="text-gray-700">hoàn thành chuyến</strong>.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#ef5222]/30 hover:bg-[#fff8f5] disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {err}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-[#ef5222]/15 bg-white shadow-xl shadow-orange-100/40 ring-1 ring-black/[0.03]">
        <div className="border-b border-gray-100 bg-gradient-to-r from-[#fff8f5] via-white to-[#f0faf5] px-5 py-4 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ef5222]">Biểu đồ</p>
          <h2 className="mt-1 text-lg font-bold text-gray-800">Doanh thu theo tháng</h2>
        </div>
        <div className="p-4 sm:p-7">
          {loading ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-gray-500">Đang tải dữ liệu…</div>
          ) : chartData.length === 0 ? (
            <div className="flex h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 text-center">
              <BarChart3 className="text-gray-300" size={40} />
              <p className="text-sm font-medium text-gray-600">Chưa có dữ liệu để vẽ biểu đồ</p>
              <p className="max-w-md text-xs text-gray-500">Khi có vé đã thanh toán hoặc hoàn thành, các cột sẽ hiện theo từng tháng đặt vé.</p>
            </div>
          ) : (
            <div className="h-[min(420px,55vh)] w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="18%">
                  <defs>
                    <linearGradient id="revBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fd7e14" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#ef5222" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => (v >= 1_000_000 ? `${Math.round(v / 1_000_000)}tr` : `${Math.round(v / 1000)}k`)}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(239, 82, 34, 0.06)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0]?.payload as { label?: string; revenue?: number; tickets?: number };
                      return (
                        <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg">
                          <p className="text-xs font-semibold text-gray-500">{p.label}</p>
                          <p className="text-sm font-bold text-[#ef5222]">{formatVnd(Number(p.revenue) || 0)}</p>
                          <p className="text-xs text-gray-600">{p.tickets ?? 0} vé</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="revenue" radius={[10, 10, 0, 0]} fill="url(#revBar)" maxBarSize={56} />
                </BarChart>
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
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/90">Tổng vé đã bán</p>
              <p className="mt-2 text-4xl font-extrabold tabular-nums text-gray-900">{loading ? '…' : totalTickets.toLocaleString('vi-VN')}</p>
              <p className="mt-2 text-sm text-gray-500">Số vé trạng thái đã thanh toán + hoàn thành (toàn hệ thống).</p>
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
              <p className="text-xs font-semibold uppercase tracking-wide text-[#c2410c]">Tổng doanh thu</p>
              <p className="mt-2 break-words text-3xl font-extrabold tabular-nums text-gray-900 sm:text-4xl">
                {loading ? '…' : formatVnd(totalRevenue)}
              </p>
              <p className="mt-2 text-sm text-gray-500">Cộng dồn <strong className="text-gray-700">tổng tiền</strong> các vé đã thu.</p>
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
