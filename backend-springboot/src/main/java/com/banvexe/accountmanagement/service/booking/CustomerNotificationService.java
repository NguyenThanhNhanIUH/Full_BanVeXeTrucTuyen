package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.dto.booking.CustomerNotificationDto;
import com.banvexe.accountmanagement.entity.KhachHang;
import com.banvexe.accountmanagement.entity.ThongBao;
import com.banvexe.accountmanagement.entity.UserAccount;
import com.banvexe.accountmanagement.entity.UserAccount.UserRole;
import com.banvexe.accountmanagement.entity.VeXe;
import com.banvexe.accountmanagement.repository.ThongBaoRepository;
import com.banvexe.accountmanagement.repository.UserAccountRepository;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CustomerNotificationService {

    private static final DateTimeFormatter INSTANT_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
        .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private final ThongBaoRepository thongBaoRepository;
    private final UserAccountRepository userAccountRepository;

    public CustomerNotificationService(
        ThongBaoRepository thongBaoRepository,
        UserAccountRepository userAccountRepository
    ) {
        this.thongBaoRepository = thongBaoRepository;
        this.userAccountRepository = userAccountRepository;
    }

    @Transactional
    public void notifyKhachHang(Integer khachHangId, String tieuDe, String noiDung, String loai, Integer veXeId) {
        if (khachHangId == null) {
            return;
        }
        ThongBao tb = new ThongBao();
        tb.setKhachHangId(khachHangId);
        tb.setTieuDe(tieuDe);
        tb.setNoiDung(noiDung);
        tb.setLoai(loai);
        tb.setVeXeId(veXeId);
        tb.setDaDoc(false);
        tb.setCreatedAt(Instant.now());
        thongBaoRepository.save(tb);
    }

    public void notifyDeferredBooking(KhachHang kh, VeXe ve) {
        if (kh == null || ve == null) {
            return;
        }
        String deadline = ve.getHanThanhToan() != null ? INSTANT_FMT.format(ve.getHanThanhToan()) : "—";
        notifyKhachHang(
            kh.getId(),
            "Đặt trước thành công",
            "Vé " + ve.getMaVe() + " đã được giữ chỗ. Hạn thanh toán: " + deadline
                + ". Vui lòng thanh toán trước hạn để giữ ghế.",
            "DAT_TRUOC",
            ve.getId()
        );
    }

    public void notifyPaymentReminder(KhachHang kh, VeXe ve, long daysLeft) {
        if (kh == null || ve == null) {
            return;
        }
        String deadline = ve.getHanThanhToan() != null ? INSTANT_FMT.format(ve.getHanThanhToan()) : "—";
        notifyKhachHang(
            kh.getId(),
            "Nhắc thanh toán vé",
            "Vé " + ve.getMaVe() + " còn " + daysLeft + " ngày đến hạn thanh toán (" + deadline + ")."
                + " Vui lòng thanh toán sớm để tránh bị hủy vé.",
            "NHAC_THANH_TOAN",
            ve.getId()
        );
    }

    public List<CustomerNotificationDto> listForEmail(String email) {
        KhachHang kh = resolveKhach(email);
        return thongBaoRepository.findTop50ByKhachHangIdOrderByCreatedAtDesc(kh.getId()).stream()
            .map(this::toDto)
            .toList();
    }

    public long unreadCountForEmail(String email) {
        KhachHang kh = resolveKhach(email);
        return thongBaoRepository.countByKhachHangIdAndDaDocFalse(kh.getId());
    }

    @Transactional
    public void markRead(String email, Long id) {
        KhachHang kh = resolveKhach(email);
        int n = thongBaoRepository.markRead(id, kh.getId());
        if (n != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông báo");
        }
    }

    @Transactional
    public void markAllRead(String email) {
        KhachHang kh = resolveKhach(email);
        thongBaoRepository.markAllRead(kh.getId());
    }

    private KhachHang resolveKhach(String email) {
        String normalized = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        UserAccount user = userAccountRepository.findByEmail(normalized)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
        if (user.getRole() != UserRole.KHACH_HANG || user.getKhachHang() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ khách hàng mới xem thông báo");
        }
        return user.getKhachHang();
    }

    private CustomerNotificationDto toDto(ThongBao tb) {
        return new CustomerNotificationDto(
            tb.getId(),
            tb.getTieuDe(),
            tb.getNoiDung(),
            tb.getLoai(),
            tb.getVeXeId(),
            tb.isDaDoc(),
            tb.getCreatedAt()
        );
    }
}
