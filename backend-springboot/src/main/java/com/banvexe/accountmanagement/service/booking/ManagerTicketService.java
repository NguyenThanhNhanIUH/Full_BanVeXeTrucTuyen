package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.dto.PageResponse;
import com.banvexe.accountmanagement.dto.booking.ManagerFullTicketRequest;
import com.banvexe.accountmanagement.dto.booking.ManagerTicketListItemDto;
import com.banvexe.accountmanagement.dto.booking.ManagerTicketStatsDto;
import com.banvexe.accountmanagement.dto.booking.ManagerTicketStatusRequest;
import com.banvexe.accountmanagement.dto.booking.StaffTicketDetailDto;
import com.banvexe.accountmanagement.entity.ChiTietVe;
import com.banvexe.accountmanagement.entity.ChuyenXe;
import com.banvexe.accountmanagement.entity.ThanhToan;
import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.entity.TuyenXe;
import com.banvexe.accountmanagement.entity.UserAccount;
import com.banvexe.accountmanagement.entity.VeXe;
import com.banvexe.accountmanagement.repository.ChiTietVeRepository;
import com.banvexe.accountmanagement.repository.ChuyenXeRepository;
import com.banvexe.accountmanagement.repository.ThanhToanRepository;
import com.banvexe.accountmanagement.repository.UserAccountRepository;
import com.banvexe.accountmanagement.repository.VeXeRepository;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ManagerTicketService {

    private static final Logger log = LoggerFactory.getLogger(ManagerTicketService.class);
    private static final int MAX_PAGE = 500;

    private final VeXeRepository veXeRepository;
    private final UserAccountRepository userAccountRepository;
    private final ChuyenXeRepository chuyenXeRepository;
    private final ChiTietVeRepository chiTietVeRepository;
    private final ThanhToanRepository thanhToanRepository;
    private final StaffBookingService staffBookingService;

    public ManagerTicketService(
        VeXeRepository veXeRepository,
        UserAccountRepository userAccountRepository,
        ChuyenXeRepository chuyenXeRepository,
        ChiTietVeRepository chiTietVeRepository,
        ThanhToanRepository thanhToanRepository,
        StaffBookingService staffBookingService
    ) {
        this.veXeRepository = veXeRepository;
        this.userAccountRepository = userAccountRepository;
        this.chuyenXeRepository = chuyenXeRepository;
        this.chiTietVeRepository = chiTietVeRepository;
        this.thanhToanRepository = thanhToanRepository;
        this.staffBookingService = staffBookingService;
    }

    @Transactional(readOnly = true)
    public ManagerTicketStatsDto getTicketStats() {
        long total = veXeRepository.count();
        long c1 = veXeRepository.countByTrangThai(TicketStatus.CHO_THANH_TOAN);
        long c2 = veXeRepository.countByTrangThai(TicketStatus.DA_THANH_TOAN);
        long c3 = veXeRepository.countByTrangThai(TicketStatus.DANG_XU_LY);
        long c4 = veXeRepository.countByTrangThai(TicketStatus.DA_HUY);
        long c5 = veXeRepository.countByTrangThai(TicketStatus.HOAN_THANH);
        return new ManagerTicketStatsDto(total, c1, c2, c3, c4, c5);
    }

    @Transactional(readOnly = true)
    public PageResponse<ManagerTicketListItemDto> listTickets(int page, int size, TicketStatus status) {
        int p = Math.max(0, page);
        int s = size < 1 ? 10 : Math.min(size, MAX_PAGE);
        List<VeXe> all = status == null
            ? veXeRepository.findAllForManagerListWithFetches()
            : veXeRepository.findByTrangThaiForManagerListWithFetches(status);
        long total = all.size();
        int totalPages = total == 0 ? 0 : (int) ((total + s - 1) / s);
        int from = p * s;
        if (from >= (int) total) {
            return new PageResponse<>(List.of(), p, s, total, totalPages);
        }
        int to = (int) Math.min((long) from + s, total);
        List<VeXe> slice = all.subList(from, to);
        return new PageResponse<>(
            slice.stream().map(this::toListItem).toList(),
            p,
            s,
            total,
            totalPages
        );
    }

    @Transactional(readOnly = true)
    public StaffTicketDetailDto getTicket(Integer id) {
        return staffBookingService.getTicketDetailById(id);
    }

    @Transactional
    public StaffTicketDetailDto updateStatus(Integer ticketId, ManagerTicketStatusRequest req) {
        VeXe ve = veXeRepository.findById(ticketId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé"));
        ve.setTrangThai(req.status());
        if (req.ghiChu() != null) {
            String g = req.ghiChu().trim();
            ve.setGhiChu(g.isEmpty() ? null : g);
        }
        veXeRepository.save(ve);
        return staffBookingService.getTicketDetailById(ticketId);
    }

    @Transactional
    public void deleteTicket(Integer ticketId) {
        VeXe ve = veXeRepository.findById(ticketId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé"));
        thanhToanRepository.deleteByVeId(ve.getId());
        chiTietVeRepository.deleteByVeId(ve.getId());
        veXeRepository.delete(ve);
    }

    @Transactional
    public StaffTicketDetailDto updateFull(Integer ticketId, ManagerFullTicketRequest req) {
        VeXe ve = veXeRepository.findByIdWithDetails(ticketId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé"));

        String m = req.maVe().trim();
        if (veXeRepository.existsByMaVeAndIdNot(m, ve.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã vé đã tồn tại: " + m);
        }
        userAccountRepository.findById(req.khachHangId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khách hàng"));
        ChuyenXe chuyen = chuyenXeRepository.findByIdWithDetails(req.chuyenXeId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến"));

        List<String> newSeats = req.maGhe().stream()
            .map(s -> BookingCatalogService.normalizeSeatCode(chuyen, s))
            .filter(s -> s != null && !s.isBlank())
            .distinct()
            .collect(Collectors.toList());
        if (newSeats.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần ít nhất một mã ghế hợp lệ");
        }

        int cap = BookingCatalogService.safeTongGhe(chuyen);
        if (cap < 1) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Chuyến / xe thiếu số ghế, không thể gán ghế cho vé."
            );
        }
        Set<String> allowed = new HashSet<>(BookingCatalogService.generateSeatLabels(chuyen));
        for (String s : newSeats) {
            if (!allowed.contains(s)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã ghế không hợp lệ: " + s);
            }
        }
        List<String> current = chiTietVeRepository.findByVeXeId(ve.getId()).stream()
            .map(ChiTietVe::getSoGhe)
            .toList();
        List<String> occupied = chiTietVeRepository.findOccupiedSeatCodes(chuyen.getId(), BookingCatalogService.STATUSES_BLOCKING_SEAT);
        for (String s : newSeats) {
            if (occupied.contains(s) && !current.contains(s)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ghế đã có người đặt: " + s);
            }
        }

        BigDecimal tong;
        if (req.tongTien() != null) {
            tong = req.tongTien();
            if (tong.compareTo(BigDecimal.ZERO) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tổng tiền không hợp lệ");
            }
        } else {
            tong = chuyen.getGiaVe().multiply(BigDecimal.valueOf(newSeats.size()));
        }

        ve.setMaVe(m);
        ve.setKhachHangId(req.khachHangId());
        ve.setChuyenXe(chuyen);
        ve.setTrangThai(req.trangThai());
        if (req.ghiChu() == null) {
            ve.setGhiChu(null);
        } else {
            String g = req.ghiChu().trim();
            ve.setGhiChu(g.isEmpty() ? null : g);
        }
        if (req.ngayDat() != null) {
            ve.setNgayDat(req.ngayDat());
        }
        ve.setSoLuongGhe(newSeats.size());
        ve.setTongTien(tong);
        veXeRepository.save(ve);

        chiTietVeRepository.deleteByVeId(ve.getId());
        for (String seat : newSeats) {
            ChiTietVe ct = new ChiTietVe();
            ct.setVeXe(ve);
            ct.setSoGhe(seat);
            chiTietVeRepository.save(ct);
        }

        List<ThanhToan> tts = thanhToanRepository.findByVeXe_Id(ve.getId());
        for (ThanhToan tt : tts) {
            tt.setSoTien(tong);
        }
        if (!tts.isEmpty()) {
            thanhToanRepository.saveAll(tts);
        }
        return staffBookingService.getTicketDetailById(ticketId);
    }

    private ManagerTicketListItemDto toListItem(VeXe v) {
        ChuyenXe c = v.getChuyenXe();
        TuyenXe t = null;
        if (c != null) {
            Hibernate.initialize(c);
            t = c.getTuyenXe();
            if (t != null) {
                Hibernate.initialize(t);
            }
        }
        if (c == null) {
            log.warn("VeXe #{}: chua gan chuyen_xe; hien thi gia tri dung tren giao dien (nen sua DB).", v.getId());
        }
        if (c != null && t == null) {
            log.warn("VeXe #{}: chuyen #{} thieu tuyen; kiem tra FK chuyen.tuyen_xe_id.", v.getId(), c.getId());
        }
        UserAccount kh = userAccountRepository.findById(v.getKhachHangId()).orElse(null);
        String tenTuyen;
        if (t != null && t.getTenTuyen() != null) {
            tenTuyen = t.getTenTuyen();
        } else if (c == null) {
            tenTuyen = "(Thiếu chuyến)";
        } else {
            tenTuyen = "(Thiếu tuyến)";
        }
        return new ManagerTicketListItemDto(
            v.getId(),
            v.getMaVe() != null ? v.getMaVe() : "",
            v.getTrangThai(),
            v.getTongTien(),
            v.getNgayDat(),
            kh != null ? kh.getEmail() : null,
            kh != null ? kh.getFullName() : null,
            v.getGhiChu(),
            tenTuyen,
            c != null ? c.getNgayDi() : null,
            c != null ? c.getGioDi() : null
        );
    }
}
