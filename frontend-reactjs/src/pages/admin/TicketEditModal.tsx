import React from 'react';
import { Ticket, Trash2 } from 'lucide-react';
import { TICKET_EDIT_STATUSES, STATUS_LABEL } from './ticketManagementConstants';
import type { TicketEditFormState, TripOption } from './ticketManagementTypes';

type TicketEditModalProps = {
  isStaff: boolean;
  modalId: number;
  detailLoad: boolean;
  modalErr: string | null;
  tripOptions: TripOption[];
  form: TicketEditFormState;
  setForm: React.Dispatch<React.SetStateAction<TicketEditFormState>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
};

const TicketEditModal: React.FC<TicketEditModalProps> = ({
  isStaff,
  modalId,
  detailLoad,
  modalErr,
  tripOptions,
  form,
  setForm,
  onSubmit,
  onClose,
  onDelete,
  saving,
  deleting,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-xl shadow-xl max-w-lg w-full p-4 space-y-3 my-8 max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center gap-2 font-semibold text-gray-900">
        <Ticket className="text-[#ef5222]" size={20} />
        {isStaff ? `Cập nhật vé #${modalId}` : `Sửa vé #${modalId}`}
      </div>
      {isStaff && (
        <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
          Chỉ cập nhật <strong>trạng thái vé</strong> và <strong>ghi chú</strong>.
        </p>
      )}
      {detailLoad && (
        <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">Đang tải chi tiết vé & danh sách chuyến…</p>
      )}
      {modalErr && <p className="text-sm text-red-800 bg-red-50 rounded-lg px-3 py-2">{modalErr}</p>}

      <div>
        <label className="text-sm text-gray-700">Mã vé</label>
        <input
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
          value={form.maVe}
          onChange={(e) => setForm((f) => ({ ...f, maVe: e.target.value }))}
          required={!isStaff}
          disabled={detailLoad || isStaff}
        />
      </div>
      <div>
        <label className="text-sm text-gray-700">ID khách hàng (khach_hang_id)</label>
        <input
          type="number"
          min={1}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={form.khachHangId}
          onChange={(e) => setForm((f) => ({ ...f, khachHangId: e.target.value }))}
          required={!isStaff}
          disabled={detailLoad || isStaff}
        />
      </div>
      <div>
        <label className="text-sm text-gray-700">Chuyến xe</label>
        <select
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={form.chuyenXeId}
          onChange={(e) => setForm((f) => ({ ...f, chuyenXeId: e.target.value }))}
          required={!isStaff}
          disabled={detailLoad || isStaff}
        >
          <option value="">— Chọn chuyến —</option>
          {tripOptions.map((t) => (
            <option key={t.id} value={t.id}>
              #{t.id} {t.tenTuyen || ''} — {t.ngayDi || ''} ({t.bienSo || 'xe?'})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm text-gray-700">Mã ghế (cách nhau bởi dấu phẩy hoặc khoảng trắng)</label>
        <textarea
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[72px] font-mono"
          value={form.maGheText}
          onChange={(e) => setForm((f) => ({ ...f, maGheText: e.target.value }))}
          placeholder="A01, A02"
          required={!isStaff}
          disabled={detailLoad || isStaff}
        />
      </div>
      <div>
        <label className="text-sm text-gray-700">Trạng thái vé</label>
        <select
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={form.trangThai}
          onChange={(e) => setForm((f) => ({ ...f, trangThai: e.target.value }))}
          required={!isStaff}
          disabled={detailLoad}
        >
          {TICKET_EDIT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s] || s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm text-gray-700">Ghi chú (VeXe.ghi_chu)</label>
        <textarea
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[72px]"
          value={form.ghiChu}
          onChange={(e) => setForm((f) => ({ ...f, ghiChu: e.target.value }))}
          disabled={detailLoad}
        />
      </div>
      <div>
        <label className="text-sm text-gray-700">Ngày đặt (local)</label>
        <input
          type="datetime-local"
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={form.ngayDatLocal}
          onChange={(e) => setForm((f) => ({ ...f, ngayDatLocal: e.target.value }))}
          disabled={detailLoad || isStaff}
        />
      </div>
      <div>
        <label className="text-sm text-gray-700">Tổng tiền (VNĐ, để trống = tự tính: giá chuyến × số ghế)</label>
        <input
          type="number"
          min={0}
          step={1000}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={form.tongTienStr}
          onChange={(e) => setForm((f) => ({ ...f, tongTienStr: e.target.value }))}
          disabled={detailLoad || isStaff}
        />
      </div>

      <div className="flex flex-wrap justify-between gap-2 pt-2">
        {!isStaff && (
          <button
            type="button"
            onClick={() => void onDelete()}
            disabled={detailLoad || saving || deleting}
            className="px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 size={16} />
            {deleting ? 'Đang xóa…' : 'Xóa vé'}
          </button>
        )}
        {isStaff && <div />}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">
            Hủy
          </button>
          <button
            type="submit"
            disabled={detailLoad || saving || deleting}
            className="px-4 py-2 rounded-lg bg-[#ef5222] text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Đang lưu…' : isStaff ? 'Lưu trạng thái & ghi chú' : 'Lưu (PUT)'}
          </button>
        </div>
      </div>
    </form>
  </div>
);

export default TicketEditModal;
