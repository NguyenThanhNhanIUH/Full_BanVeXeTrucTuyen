package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.dto.booking.StaffTicketDetailDto;
import com.banvexe.accountmanagement.dto.booking.StaffUpdateTicketRequest;
import com.banvexe.accountmanagement.dto.booking.TripRunStatusUpdateRequest;
import com.banvexe.accountmanagement.dto.booking.TripSummaryDto;
import com.banvexe.accountmanagement.entity.ChiTietVe;
import com.banvexe.accountmanagement.entity.ChuyenXe;
import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.entity.VeXe;
import com.banvexe.accountmanagement.repository.ChiTietVeRepository;
import com.banvexe.accountmanagement.repository.ChuyenXeRepository;
import com.banvexe.accountmanagement.repository.UserAccountRepository;
import com.banvexe.accountmanagement.repository.VeXeRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StaffBookingService {

    private final VeXeRepository veXeRepository;
    private final ChiTietVeRepository chiTietVeRepository;
    private final UserAccountRepository userAccountRepository;
    private final ChuyenXeRepository chuyenXeRepository;
    private final BookingCatalogService bookingCatalogService;

    public StaffBookingService(
        VeXeRepository veXeRepository,
        ChiTietVeRepository chiTietVeRepository,
        UserAccountRepository userAccountRepository,
        ChuyenXeRepository chuyenXeRepository,
        BookingCatalogService bookingCatalogService
    ) {
        this.veXeRepository = veXeRepository;
        this.chiTietVeRepository = chiTietVeRepository;
        this.userAccountRepository = userAccountRepository;
        this.chuyenXeRepository = chuyenXeRepository;
        this.bookingCatalogService = bookingCatalogService;
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
            var user = userAccountRepository.findByPhone(soDienThoai.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khách với SĐT này"));
            List<VeXe> list = veXeRepository.findByKhachHangIdOrderByNgayDatDesc(user.getId());
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
                .map(s -> s.trim().toUpperCase(Locale.ROOT))
                .distinct()
                .toList();
            int cap = BookingCatalogService.safeTongGhe(chuyen);
            Set<String> allowed = new HashSet<>(BookingCatalogService.generateSeatLabels(Math.max(0, cap)));
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
        return toStaffDetail(veXeRepository.findByIdWithDetails(ve.getId()).orElse(ve));
    }

    @Transactional
    public void approveCancelTicket(Integer ticketId) {
        VeXe ve = veXeRepository.findById(ticketId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé"));
        if (ve.getTrangThai() != TicketStatus.DANG_XU_LY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vé không ở trạng thái chờ duyệt hủy");
        }
        ve.setTrangThai(TicketStatus.DA_HUY);
        veXeRepository.save(ve);
    }

    @Transactional
    public void updateTripStatus(Integer chuyenId, TripRunStatusUpdateRequest req) {
        ChuyenXe c = chuyenXeRepository.findById(chuyenId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến"));
        c.setTrangThai(req.trangThai());
        chuyenXeRepository.save(c);
    }

    private StaffTicketDetailDto toStaffDetail(VeXe ve) {
        var user = userAccountRepository.findById(ve.getKhachHangId()).orElse(null);
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
            user != null ? user.getEmail() : null,
            user != null ? user.getFullName() : null,
            user != null ? user.getPhone() : null,
            seats,
            trip
        );
    }
}
