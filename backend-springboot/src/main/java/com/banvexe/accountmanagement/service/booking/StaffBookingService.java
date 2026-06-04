package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.dto.booking.StaffTicketDetailDto;
import com.banvexe.accountmanagement.dto.booking.StaffUpdateTicketRequest;
import com.banvexe.accountmanagement.dto.booking.TripRunStatusUpdateRequest;
import com.banvexe.accountmanagement.dto.booking.TripSummaryDto;
import com.banvexe.accountmanagement.entity.ChiTietVe;
import com.banvexe.accountmanagement.entity.ChuyenXe;
import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.entity.KhachHang;
import com.banvexe.accountmanagement.entity.VeXe;
import com.banvexe.accountmanagement.repository.ChiTietVeRepository;
import com.banvexe.accountmanagement.repository.ChuyenXeRepository;
import com.banvexe.accountmanagement.repository.KhachHangRepository;
import com.banvexe.accountmanagement.repository.VeXeRepository;
import com.banvexe.accountmanagement.util.AfterCommit;
import com.banvexe.accountmanagement.util.TicketGhiChuUtil;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StaffBookingService {

    private final VeXeRepository veXeRepository;
    private final ChiTietVeRepository chiTietVeRepository;
    private final KhachHangRepository khachHangRepository;
    private final ChuyenXeRepository chuyenXeRepository;
    private final BookingCatalogService bookingCatalogService;
    private final CustomerNotificationService customerNotificationService;

    public StaffBookingService(
        VeXeRepository veXeRepository,
        ChiTietVeRepository chiTietVeRepository,
        KhachHangRepository khachHangRepository,
        ChuyenXeRepository chuyenXeRepository,
        BookingCatalogService bookingCatalogService,
        CustomerNotificationService customerNotificationService
    ) {
        this.veXeRepository = veXeRepository;
        this.chiTietVeRepository = chiTietVeRepository;
        this.khachHangRepository = khachHangRepository;
        this.chuyenXeRepository = chuyenXeRepository;
        this.bookingCatalogService = bookingCatalogService;
        this.customerNotificationService = customerNotificationService;
    }

    @Transactional(readOnly = true)
    public StaffTicketDetailDto getTicketDetailById(Integer ticketId) {
        VeXe ve = veXeRepository.findByIdWithDetails(ticketId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé"));
        return toStaffDetail(ve);
    }

    public StaffTicketDetailDto searchTicket(String maVe, String soDienThoai) {
        if (StringUtils.hasText(maVe)) {
            VeXe ve = veXeRepository.findByMaVe(maVe.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé"));
            return toStaffDetail(veXeRepository.findByIdWithDetails(ve.getId()).orElse(ve));
        }
        if (StringUtils.hasText(soDienThoai)) {
            KhachHang kh = khachHangRepository.findByPhone(soDienThoai.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khách với SĐT này"));
            List<VeXe> list = veXeRepository.findByKhachHangIdOrderByNgayDatDesc(kh.getId());
            if (list.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Khách chưa có vé");
            }
            VeXe ve = list.get(0);
            return toStaffDetail(veXeRepository.findByIdWithDetails(ve.getId()).orElse(ve));
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần mã vé hoặc số điện thoại");
    }

    @Transactional
    public StaffTicketDetailDto updateTicket(Integer ticketId, StaffUpdateTicketRequest req) {
        VeXe ve = veXeRepository.findByIdWithDetails(ticketId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé"));
        if (req.ghiChu() != null) {
            ve.setGhiChu(req.ghiChu());
        }
        if (req.maGheMoi() != null && !req.maGheMoi().isEmpty()) {
            ChuyenXe chuyen = ve.getChuyenXe();
            List<String> newSeats = req.maGheMoi().stream()
                .map(s -> BookingCatalogService.normalizeSeatCode(chuyen, s))
                .filter(s -> s != null && !s.isBlank())
                .distinct()
                .toList();
            Set<String> allowed = new HashSet<>(BookingCatalogService.generateSeatLabels(chuyen));
            for (String s : newSeats) {
                if (!allowed.contains(s)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã ghế không hợp lệ: " + s);
                }
            }
            List<String> occupied = chiTietVeRepository.findOccupiedSeatCodes(chuyen.getId(), BookingCatalogService.STATUSES_BLOCKING_SEAT);
            List<String> current = chiTietVeRepository.findByVeXeId(ve.getId()).stream().map(ChiTietVe::getSoGhe).toList();
            for (String s : newSeats) {
                if (occupied.contains(s) && !current.contains(s)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Ghế đã có người đặt: " + s);
                }
            }
            chiTietVeRepository.deleteAll(chiTietVeRepository.findByVeXeId(ve.getId()));
            ve.setSoLuongGhe(newSeats.size());
            ve.setTongTien(chuyen.getGiaVe().multiply(java.math.BigDecimal.valueOf(newSeats.size())));
            veXeRepository.save(ve);
            for (String seat : newSeats) {
                ChiTietVe ct = new ChiTietVe();
                ct.setVeXe(ve);
                ct.setSoGhe(seat);
                chiTietVeRepository.save(ct);
            }
        } else {
            veXeRepository.save(ve);
        }
        if (StringUtils.hasText(req.trangThai())) {
            try {
                ve.setTrangThai(TicketStatus.valueOf(req.trangThai().trim()));
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái vé không hợp lệ");
            }
        }
        if (ve.getTrangThai() == TicketStatus.DA_HUY) {
            String noiDung = TicketGhiChuUtil.noiDungHuyTheoCapNhat(
                req.ghiChu() != null ? req.ghiChu() : null,
                "vé đã hủy theo cập nhật từ nhân viên"
            );
            ve.setGhiChu(TicketGhiChuUtil.ghiChuHuyThanhCong(noiDung));
        }
        veXeRepository.saveAndFlush(ve);
        return toStaffDetail(veXeRepository.findByIdWithDetails(ve.getId()).orElse(ve));
    }

    @Transactional(readOnly = true)
    public List<StaffTicketDetailDto> listCancelRequests() {
        return veXeRepository.findByTrangThaiForManagerListWithFetches(TicketStatus.DANG_XU_LY)
            .stream()
            .filter(v -> TicketGhiChuUtil.ghiChuCoYeuCauHuy(v.getGhiChu()))
            .map(this::toStaffDetail)
            .collect(Collectors.toList());
    }

    /** Số yêu cầu hủy đang chờ (nhẹ hơn gọi list + map DTO khi chưa có yêu cầu). */
    @Transactional(readOnly = true)
    public long countCancelRequests() {
        return veXeRepository.findByTrangThaiForManagerListWithFetches(TicketStatus.DANG_XU_LY)
            .stream()
            .filter(v -> TicketGhiChuUtil.ghiChuCoYeuCauHuy(v.getGhiChu()))
            .count();
    }

    @Transactional
    public void approveCancelTicket(Integer ticketId) {
        VeXe ve = veXeRepository.findById(ticketId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé"));
        if (ve.getTrangThai() != TicketStatus.DANG_XU_LY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vé không ở trạng thái chờ duyệt hủy");
        }
        if (!TicketGhiChuUtil.ghiChuCoYeuCauHuy(ve.getGhiChu())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vé này không phải yêu cầu hủy từ khách hàng");
        }
        String oneLine = TicketGhiChuUtil.ghiChuHuyThanhCong("yêu cầu hủy đã được duyệt");
        int n = veXeRepository.updateGhiChuAndTrangThaiById(ticketId, oneLine, TicketStatus.DA_HUY);
        if (n != 1) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Không cập nhật được ghi chú / trạng thái vé. Thử lại."
            );
        }
        notifyCancelDecisionAfterCommit(ve.getKhachHangId(), ticketId, true, null);
    }

    @Transactional
    public void rejectCancelTicket(Integer ticketId, String lyDo) {
        VeXe ve = veXeRepository.findById(ticketId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé"));
        if (ve.getTrangThai() != TicketStatus.DANG_XU_LY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vé không ở trạng thái chờ duyệt hủy");
        }
        if (!TicketGhiChuUtil.ghiChuCoYeuCauHuy(ve.getGhiChu())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vé này không phải yêu cầu hủy từ khách hàng");
        }
        String reason = (lyDo == null || lyDo.isBlank()) ? "Không nêu lý do" : lyDo.trim();
        String line = TicketGhiChuUtil.ghiChuTuChoiHuy(reason);
        TicketStatus restoreStatus = ve.getHanThanhToan() != null
            ? TicketStatus.DAT_TRUOC
            : TicketStatus.DA_THANH_TOAN;
        int n = veXeRepository.updateGhiChuAndTrangThaiById(ticketId, line, restoreStatus);
        if (n != 1) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Không cập nhật được từ chối hủy. Thử lại."
            );
        }
        notifyCancelDecisionAfterCommit(ve.getKhachHangId(), ticketId, false, reason);
    }

    private void notifyCancelDecisionAfterCommit(
        Integer khachHangId,
        Integer ticketId,
        boolean approved,
        String rejectReason
    ) {
        if (khachHangId == null || ticketId == null) {
            return;
        }
        AfterCommit.run(() -> {
            KhachHang kh = khachHangRepository.findById(khachHangId).orElse(null);
            VeXe updated = veXeRepository.findByIdWithDetails(ticketId).orElse(null);
            if (kh == null || updated == null) {
                return;
            }
            if (approved) {
                customerNotificationService.notifyCancelApproved(kh, updated);
            } else {
                customerNotificationService.notifyCancelRejected(kh, updated, rejectReason);
            }
        });
    }

    @Transactional
    public void updateTripStatus(Integer chuyenId, TripRunStatusUpdateRequest req) {
        ChuyenXe c = chuyenXeRepository.findById(chuyenId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến"));
        c.setTrangThai(req.trangThai());
        chuyenXeRepository.save(c);
    }

    private StaffTicketDetailDto toStaffDetail(VeXe ve) {
        KhachHang kh = khachHangRepository.findById(ve.getKhachHangId()).orElse(null);
        ChuyenXe c = ve.getChuyenXe();
        if (c == null) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Vé #" + ve.getId() + " thiếu thông tin chuyến."
            );
        }
        var t = c.getTuyenXe();
        var x = c.getXe();
        int trong = bookingCatalogService.countAvailableSeats(c);
        int tongGhe = BookingCatalogService.safeTongGhe(c);
        Integer thoiGianDuKienPhut = t != null ? t.getThoiGianDuKien() : null;
        var gioDenDuKien = (thoiGianDuKienPhut != null && c.getGioDi() != null)
            ? c.getGioDi().plusMinutes(thoiGianDuKienPhut)
            : null;
        TripSummaryDto trip = new TripSummaryDto(
            c.getId(),
            t != null ? t.getTenTuyen() : "",
            t != null ? t.getDiemDi() : "",
            t != null ? t.getDiemDen() : "",
            c.getNgayDi(),
            c.getGioDi(),
            gioDenDuKien,
            thoiGianDuKienPhut,
            t != null ? t.getKhoangCach() : null,
            c.getGiaVe(),
            x != null ? x.getLoaiXe() : "",
            x != null ? x.getBienSo() : "",
            tongGhe,
            trong,
            c.getTrangThai() != null ? c.getTrangThai().name() : "UNKNOWN"
        );
        List<String> seats = chiTietVeRepository.findByVeXeId(ve.getId()).stream()
            .map(ChiTietVe::getSoGhe)
            .toList();
        return new StaffTicketDetailDto(
            ve.getId(),
            ve.getMaVe(),
            ve.getTrangThai(),
            ve.getTongTien(),
            ve.getNgayDat(),
            ve.getGhiChu(),
            ve.getKhachHangId(),
            kh != null ? kh.getEmail() : null,
            kh != null ? kh.getFullName() : null,
            kh != null ? kh.getPhone() : null,
            seats,
            trip
        );
    }
}
