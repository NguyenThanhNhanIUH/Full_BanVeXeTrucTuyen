import React, { type ReactNode } from 'react';

export type AdminStatItem = {
  label: string;
  value: number | string;
  icon: ReactNode;
  color: string;
  bg: string;
  border: string;
  /** Có thì ô bấm được khi `onItemClick` được truyền */
  actionKey?: string;
};

type Props = {
  title: string;
  loading?: boolean;
  items: AdminStatItem[];
  /** Tailwind grid classes, e.g. grid-cols-2 md:grid-cols-3 xl:grid-cols-4 */
  gridClassName?: string;
  className?: string;
  onItemClick?: (actionKey: string) => void;
  /** Khớp `actionKey` của một ô để viền sáng (ô đang lọc) */
  activeActionKey?: string | null;
  /** Nếu có, dùng thay cho so khớp `activeActionKey` (lọc phức tạp) */
  isItemActive?: (item: AdminStatItem) => boolean;
  /** Gợi ý dưới tiêu đề khi có `onItemClick` */
  clickHint?: string;
};

const defaultGrid = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6';

const AdminPageStats: React.FC<Props> = ({
  title,
  loading,
  items,
  gridClassName = defaultGrid,
  className = '',
  onItemClick,
  activeActionKey = null,
  isItemActive,
  clickHint = 'Bấm ô thống kê để lọc bảng bên dưới.',
}) => (
  <div className={`relative z-[2] ${className}`.trim()}>
    <h3 className={`text-sm font-semibold text-gray-500 uppercase tracking-wide ${onItemClick ? '' : 'mb-3'}`}>{title}</h3>
    {onItemClick && <p className="mb-3 mt-1 text-xs text-gray-500">{clickHint}</p>}
    <div className={gridClassName}>
      {items.map((s, i) => {
        const clickable = Boolean(onItemClick && s.actionKey);
        const active =
          clickable &&
          (isItemActive != null
            ? isItemActive(s)
            : activeActionKey != null && s.actionKey === activeActionKey);
        const cardClass = `bg-white rounded-xl shadow-sm border ${s.border} p-4 flex items-center justify-between transition ${
          active ? 'ring-2 ring-[#ef5222] ring-offset-2' : ''
        } ${clickable ? 'hover:shadow-md hover:border-[#ef5222]/40 cursor-pointer active:scale-[0.99]' : ''}`;

        const body = (
          <div className="pointer-events-none flex w-full min-w-0 items-center justify-between gap-3 text-left [&_svg]:shrink-0">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-2xl font-extrabold text-gray-800">{loading ? '…' : s.value}</p>
            </div>
            <div className={`shrink-0 p-2.5 rounded-xl ${s.bg} ${s.color}`}>{s.icon}</div>
          </div>
        );

        if (clickable && s.actionKey && onItemClick) {
          const key = s.actionKey;
          return (
            <button
              key={i}
              type="button"
              aria-pressed={active || undefined}
              onClick={() => onItemClick(key)}
              className={`${cardClass} w-full min-h-[4.5rem] touch-manipulation select-none`}
            >
              {body}
            </button>
          );
        }

        return (
          <div key={i} className={cardClass}>
            {body}
          </div>
        );
      })}
    </div>
  </div>
);

export default AdminPageStats;
