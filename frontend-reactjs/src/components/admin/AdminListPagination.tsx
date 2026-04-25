import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

export const ADMIN_PAGE_SIZE = 10;

type Props = {
  page: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
};

const btnClass =
  'inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40';

const AdminListPagination = ({ page, total, pageSize = ADMIN_PAGE_SIZE, onPageChange }: Props) => {
  const totalPages = total === 0 ? 0 : Math.max(1, Math.ceil(total / pageSize));
  const lastIndex = Math.max(0, totalPages - 1);
  const safePage = total === 0 ? 0 : Math.min(Math.max(0, page), lastIndex);
  const from = total === 0 ? 0 : safePage * pageSize + 1;
  const to = total === 0 ? 0 : Math.min(total, (safePage + 1) * pageSize);

  return (
    <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-gray-600">
        {total === 0 ? (
          'Không có bản ghi.'
        ) : (
          <>
            Hiển thị <span className="font-semibold text-gray-800">{from}</span>–
            <span className="font-semibold text-gray-800">{to}</span> / {total} (trang{' '}
            <span className="font-semibold text-gray-800">{safePage + 1}</span>/{totalPages})
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button type="button" className={btnClass} disabled={total === 0 || safePage <= 0} onClick={() => onPageChange(0)} title="Trang đầu">
          <ChevronsLeft size={16} />
          <span className="hidden sm:inline">Đầu</span>
        </button>
        <button
          type="button"
          className={btnClass}
          disabled={total === 0 || safePage <= 0}
          onClick={() => onPageChange(safePage - 1)}
          title="Trang trước"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Trước</span>
        </button>
        <button
          type="button"
          className={btnClass}
          disabled={total === 0 || safePage >= lastIndex}
          onClick={() => onPageChange(safePage + 1)}
          title="Trang sau"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          className={btnClass}
          disabled={total === 0 || safePage >= lastIndex}
          onClick={() => onPageChange(lastIndex)}
          title="Trang cuối"
        >
          <span className="hidden sm:inline">Cuối</span>
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default AdminListPagination;
