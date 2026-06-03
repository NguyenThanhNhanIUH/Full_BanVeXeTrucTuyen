import { useEffect, useState } from 'react';
import {
  getSeatLayoutByVehicleType,
  gheHienThiTrenBang,
  isSeatUnavailable,
  type SeatMapResponse,
  type SeatStatus,
} from '../../../utils/seatMapLayout';
import { addMinutesToTime, formatCurrency, formatDuration } from './homeFormatters';
import { TripPolicyPanel, TripSchedulePanel, TripTransferPanel } from './homeTripCardTabPanels';
import type { ResultTab, TripSummary } from './homeTypes';

type DetailTab = 'seats' | 'schedule' | 'transfer' | 'policy';

type HomeTripCardProps = {
  trip: TripSummary;
  tripDangChonGhe: number | null;
  dangTaiSoDoGhe: boolean;
  soDoGheTheoChuyen: Record<number, SeatMapResponse>;
  gheDangChonTheoChuyen: Record<number, string[]>;
  confirmedHoldsForTrip?: ReadonlySet<string>;
  onToggleSeatPanel: (tripId: number) => void;
  onEnsureTripPanelOpen: (tripId: number) => void;
  onSelectSeat: (tripId: number, seat: SeatStatus) => void;
  onChooseTrip: (trip: TripSummary) => void;
  tripType: 'one-way' | 'round-trip';
  activeResultTab: ResultTab;
};

const tabBtnClass = (active: boolean) =>
  `shrink-0 pb-1 border-b-2 transition text-sm ${
    active ? 'text-[#ef5222] border-[#ef5222] font-semibold' : 'text-gray-700 border-transparent hover:text-[#ef5222]'
  }`;

const HomeTripCard = ({
  trip,
  tripDangChonGhe,
  dangTaiSoDoGhe,
  soDoGheTheoChuyen,
  gheDangChonTheoChuyen,
  confirmedHoldsForTrip,
  onToggleSeatPanel,
  onEnsureTripPanelOpen,
  onSelectSeat,
  onChooseTrip,
  tripType,
  activeResultTab,
}: HomeTripCardProps) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('seats');
  const gioDenHienThi = trip.gioDenDuKien || addMinutesToTime(trip.gioDi, trip.thoiGianDuKienPhut) || '';

  useEffect(() => {
    if (tripDangChonGhe !== trip.id) {
      setActiveTab('seats');
    }
  }, [tripDangChonGhe, trip.id]);

  const onChonGheTabClick = () => {
    if (tripDangChonGhe === trip.id && activeTab === 'seats') {
      onToggleSeatPanel(trip.id);
      return;
    }
    if (tripDangChonGhe === trip.id) {
      setActiveTab('seats');
      return;
    }
    setActiveTab('seats');
    onToggleSeatPanel(trip.id);
  };

  const onDetailTabClick = (tab: DetailTab) => {
    setActiveTab(tab);
    onEnsureTripPanelOpen(trip.id);
  };

  const openPolicyFromNote = () => {
    setActiveTab('policy');
    onEnsureTripPanelOpen(trip.id);
  };

  return (
    <div id={`trip-card-${trip.id}`} className="rounded-xl border border-[#ef5222]/40 p-3 hover:shadow-md transition bg-white">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-[72px]">
              <p className="text-3xl font-bold text-gray-900 leading-none">{trip.gioDi?.slice(0, 5) || '--:--'}</p>
              <p className="text-[20px] leading-none text-green-700 mt-0.5">•</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5 leading-tight truncate">{trip.diemDi || '---'}</p>
              <button
                type="button"
                onClick={openPolicyFromNote}
                className="mt-1 text-left text-xs font-medium text-[#ef5222] hover:underline"
              >
                Lưu ý: xem chính sách & điều kiện vé
              </button>
            </div>

            <div className="flex-1 px-1 pt-0.5">
              <div className="border-t border-dotted border-gray-300 mt-2" />
              <p className="text-sm font-semibold text-gray-700 mt-1.5 text-center">
                {formatDuration(trip.thoiGianDuKienPhut)}
                {trip.khoangCach ? ` - ${trip.khoangCach}Km` : ''}
              </p>
              <p className="text-xs text-gray-500 text-center">(Asia/Ho Chi Minh)</p>
            </div>

            <div className="min-w-[72px] text-right">
              <p className="text-3xl font-bold text-gray-900 leading-none">{gioDenHienThi?.slice(0, 5) || '--:--'}</p>
              <p className="text-[20px] leading-none text-[#ef5222] mt-0.5">•</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5 leading-tight truncate">{trip.diemDen || '---'}</p>
            </div>
          </div>
        </div>

        <div className="min-w-[145px] text-right pt-0.5">
          <p className="text-xs text-gray-500">
            {trip.loaiXe ? <span>{trip.loaiXe} • </span> : null}
            <span className="font-semibold text-green-600">{trip.soGheTrong} chỗ trống</span>
          </p>
          <p className="text-2xl font-bold text-[#ef5222] mt-1">{formatCurrency(Number(trip.giaVe || 0))}</p>
        </div>
      </div>

      <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 -mb-0.5 scrollbar-thin">
          <button type="button" onClick={onChonGheTabClick} className={tabBtnClass(activeTab === 'seats' && tripDangChonGhe === trip.id)}>
            Chọn ghế
          </button>
          <button type="button" onClick={() => onDetailTabClick('schedule')} className={`${tabBtnClass(activeTab === 'schedule')} ml-4`}>
            Lịch trình
          </button>
          <button type="button" onClick={() => onDetailTabClick('transfer')} className={`${tabBtnClass(activeTab === 'transfer')} ml-4`}>
            Trung chuyển
          </button>
          <button type="button" onClick={() => onDetailTabClick('policy')} className={`${tabBtnClass(activeTab === 'policy')} ml-4`}>
            Chính sách
          </button>
        </div>
        <button
          type="button"
          onClick={() => onChooseTrip(trip)}
          className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold bg-[#ef5222] text-white hover:bg-[#d84a1e] transition"
        >
          {tripType === 'round-trip'
            ? activeResultTab === 'outbound'
              ? 'Chọn chuyến đi'
              : 'Chọn chuyến về'
            : 'Chọn chuyến'}
        </button>
      </div>

      {tripDangChonGhe === trip.id && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          {activeTab === 'schedule' && <TripSchedulePanel trip={trip} gioDenHienThi={gioDenHienThi} />}
          {activeTab === 'transfer' && <TripTransferPanel />}
          {activeTab === 'policy' && <TripPolicyPanel />}

          {activeTab === 'seats' && (
            <>
              {dangTaiSoDoGhe && !soDoGheTheoChuyen[trip.id] && <p className="text-sm text-gray-500">Đang tải sơ đồ ghế...</p>}
              {soDoGheTheoChuyen[trip.id] && (
                <>
                  <div className="flex items-center justify-center gap-10 text-base text-gray-700 mb-5 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-5 h-5 rounded-md bg-gray-300 border border-gray-300" />
                      Đã bán
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-5 h-5 rounded-md bg-blue-50 border border-blue-300" />
                      Còn trống
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-5 h-5 rounded-md bg-[#fff3ef] border border-[#ef5222]" />
                      Đang chọn
                    </span>
                  </div>
                  {(() => {
                    const apiSeats = soDoGheTheoChuyen[trip.id].ghe;
                    const layout = getSeatLayoutByVehicleType(trip.loaiXe || '', apiSeats);
                    const renderSeatButton = (seat: SeatStatus & { hienThiGhe?: string }, sizeClass = 'w-11 h-11 md:w-12 md:h-12') => {
                      if (!seat.maGhe) return null;
                      const selected = (gheDangChonTheoChuyen[trip.id] ?? []).includes(seat.maGhe);
                      const confirmed = confirmedHoldsForTrip;
                      const unavailable = isSeatUnavailable(seat, gheDangChonTheoChuyen[trip.id] ?? [], confirmed);
                      const seatClass = seat.daBan
                        ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                        : seat.dangGiuCho && !confirmed?.has(seat.maGhe)
                          ? 'bg-amber-100 text-amber-700 border-amber-300 cursor-not-allowed'
                          : selected
                            ? 'bg-[#fff3ef] text-[#ef5222] border-[#ef5222] cursor-pointer shadow-[0_2px_6px_rgba(239,82,34,0.2)]'
                            : 'bg-blue-50 text-blue-500 border-blue-300 cursor-pointer hover:bg-blue-100';
                      return (
                        <button
                          key={seat.maGhe}
                          type="button"
                          onClick={() => onSelectSeat(trip.id, seat)}
                          disabled={unavailable}
                          title={seat.dangGiuCho ? 'Ghế đang được giữ chỗ' : undefined}
                          className={`${sizeClass} text-[13px] font-bold rounded-lg border-2 leading-none transition ${seatClass}`}
                        >
                          {seat.hienThiGhe ?? seat.maGhe}
                        </button>
                      );
                    };
                    return (
                      <>
                        {layout.tangDuoi && layout.tangTren && (
                          <div className="mb-4 flex w-full flex-col items-center">
                            <div className="grid w-full max-w-3xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-700 mb-2 text-center">Tầng dưới</p>
                                <div className="space-y-3 max-w-md mx-auto">
                                  {layout.tangDuoi.map((row, rowIdx) => (
                                    <div key={`duoi-${rowIdx}`} className="grid grid-cols-3 gap-3 w-fit mx-auto">
                                      {row.length === 2 ? (
                                        <>
                                          {renderSeatButton(row[0] as SeatStatus)}
                                          <div className="w-11 h-11 md:w-12 md:h-12" />
                                          {renderSeatButton(row[1] as SeatStatus)}
                                        </>
                                      ) : (
                                        row.map((seat) => renderSeatButton(seat as SeatStatus))
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-700 mb-2 text-center">Tầng trên</p>
                                <div className="space-y-3 max-w-md mx-auto">
                                  {layout.tangTren.map((row, rowIdx) => (
                                    <div key={`tren-${rowIdx}`} className="grid grid-cols-3 gap-3 w-fit mx-auto">
                                      {row.length === 2 ? (
                                        <>
                                          {renderSeatButton(row[0] as SeatStatus)}
                                          <div className="w-11 h-11 md:w-12 md:h-12" />
                                          {renderSeatButton(row[1] as SeatStatus)}
                                        </>
                                      ) : (
                                        row.map((seat) => renderSeatButton(seat as SeatStatus))
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {layout.tangDuoi && !layout.tangTren && (
                          <div className="mb-4">
                            <p className="text-sm font-semibold text-gray-700 mb-2 text-center">Tầng dưới</p>
                            <div className="space-y-3 max-w-md mx-auto">
                              {layout.tangDuoi.map((row, rowIdx) => (
                                <div key={`duoi-only-${rowIdx}`} className="grid grid-cols-3 gap-3 w-fit mx-auto">
                                  {row.length === 2 ? (
                                    <>
                                      {renderSeatButton(row[0] as SeatStatus)}
                                      <div className="w-11 h-11 md:w-12 md:h-12" />
                                      {renderSeatButton(row[1] as SeatStatus)}
                                    </>
                                  ) : (
                                    row.map((seat) => renderSeatButton(seat as SeatStatus))
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {layout.tangTren && !layout.tangDuoi && (
                          <div className="mb-4">
                            <p className="text-sm font-semibold text-gray-700 mb-2 text-center">Tầng trên</p>
                            <div className="space-y-3 max-w-md mx-auto">
                              {layout.tangTren.map((row, rowIdx) => (
                                <div key={`tren-only-${rowIdx}`} className="grid grid-cols-3 gap-3 w-fit mx-auto">
                                  {row.length === 2 ? (
                                    <>
                                      {renderSeatButton(row[0] as SeatStatus)}
                                      <div className="w-11 h-11 md:w-12 md:h-12" />
                                      {renderSeatButton(row[1] as SeatStatus)}
                                    </>
                                  ) : (
                                    row.map((seat) => renderSeatButton(seat as SeatStatus))
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {layout.single && (
                          <div className="mb-4">
                            <p className="text-sm font-semibold text-gray-700 mb-2 text-center">
                              {layout.singleType === 'limousine' ? 'Sơ đồ Limousine' : 'Sơ đồ ghế'}
                            </p>
                            {layout.singleType === 'seat' ? (
                              <div className="space-y-3 max-w-md mx-auto">
                                {layout.single.map((row, rowIdx) => (
                                  <div key={`single-seat-${rowIdx}`} className="flex items-center justify-center gap-10">
                                    <div className="flex gap-3">{row.slice(0, 2).map((seat) => renderSeatButton(seat as SeatStatus))}</div>
                                    <div className="flex gap-3">{row.slice(2).map((seat) => renderSeatButton(seat as SeatStatus))}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-2 max-w-[220px] mx-auto">
                                {layout.single.map((row, rowIdx) => (
                                  <div key={`single-limo-${rowIdx}`} className="grid grid-cols-3 gap-2 w-fit mx-auto">
                                    {row.length === 3 ? (
                                      row.map((seat) => renderSeatButton(seat as SeatStatus, 'w-10 h-10'))
                                    ) : (
                                      <>
                                        {renderSeatButton(row[0] as SeatStatus, 'w-10 h-10')}
                                        <div className="w-10 h-10" />
                                        {row[1] ? renderSeatButton(row[1] as SeatStatus, 'w-10 h-10') : <div className="w-10 h-10" />}
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {(gheDangChonTheoChuyen[trip.id] ?? []).length > 0 && (
                    <div className="mt-4 flex items-center justify-between flex-wrap gap-2 border-t border-gray-100 pt-3">
                      <div>
                        <p className="text-sm text-gray-700">{(gheDangChonTheoChuyen[trip.id] ?? []).length} Vé</p>
                        <p className="text-sm font-semibold text-gray-700">
                          {gheHienThiTrenBang(
                            gheDangChonTheoChuyen[trip.id] ?? [],
                            soDoGheTheoChuyen[trip.id] ?? null,
                            trip.loaiXe || '',
                          )}
                        </p>
                      </div>
                      <div className="flex items-end gap-0.75">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Tổng tiền</p>
                          <p className="text-lg font-bold text-[#ef5222]">
                            {formatCurrency((gheDangChonTheoChuyen[trip.id] ?? []).length * Number(trip.giaVe || 0))}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onChooseTrip(trip)}
                          className="px-6 py-2 rounded-full text-sm font-semibold bg-[#ef5222] text-white hover:bg-[#d84a1e] transition"
                        >
                          {tripType === 'round-trip'
                            ? activeResultTab === 'outbound'
                              ? 'Chọn chuyến đi'
                              : 'Chọn chuyến về'
                            : 'Chọn'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default HomeTripCard;
