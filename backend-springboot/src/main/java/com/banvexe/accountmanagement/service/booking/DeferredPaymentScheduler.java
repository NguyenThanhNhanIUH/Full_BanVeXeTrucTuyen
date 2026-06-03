package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.entity.KhachHang;
import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.entity.VeNhacThanhToan;
import com.banvexe.accountmanagement.entity.VeXe;
import com.banvexe.accountmanagement.repository.KhachHangRepository;
import com.banvexe.accountmanagement.repository.VeNhacThanhToanRepository;
import com.banvexe.accountmanagement.repository.VeXeRepository;
import com.banvexe.accountmanagement.util.TicketGhiChuUtil;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DeferredPaymentScheduler {

    private static final Logger log = LoggerFactory.getLogger(DeferredPaymentScheduler.class);
    private static final List<Long> REMINDER_DAYS = List.of(7L, 3L, 1L);

    private final VeXeRepository veXeRepository;
    private final KhachHangRepository khachHangRepository;
    private final VeNhacThanhToanRepository veNhacThanhToanRepository;
    private final DeferredBookingPolicy deferredBookingPolicy;
    private final BookingNotificationService bookingNotificationService;
    private final CustomerNotificationService customerNotificationService;

    public DeferredPaymentScheduler(
        VeXeRepository veXeRepository,
        KhachHangRepository khachHangRepository,
        VeNhacThanhToanRepository veNhacThanhToanRepository,
        DeferredBookingPolicy deferredBookingPolicy,
        BookingNotificationService bookingNotificationService,
        CustomerNotificationService customerNotificationService
    ) {
        this.veXeRepository = veXeRepository;
        this.khachHangRepository = khachHangRepository;
        this.veNhacThanhToanRepository = veNhacThanhToanRepository;
        this.deferredBookingPolicy = deferredBookingPolicy;
        this.bookingNotificationService = bookingNotificationService;
        this.customerNotificationService = customerNotificationService;
    }

    @Scheduled(fixedDelayString = "${app.booking.hold-check-delay-ms:30000}")
    @Transactional
    public void cancelExpiredDeferredTickets() {
        try {
            Instant now = Instant.now();
            List<VeXe> expired = veXeRepository.findTop200ByTrangThaiAndHanThanhToanBeforeOrderByHanThanhToanAsc(
                TicketStatus.DAT_TRUOC,
                now
            );
            for (VeXe ve : expired) {
                ve.setTrangThai(TicketStatus.DA_HUY);
                ve.setGhiChu(TicketGhiChuUtil.ghiChuHuyThanhCong("quá hạn thanh toán vé đặt trước"));
            }
            if (!expired.isEmpty()) {
                veXeRepository.saveAll(expired);
            }
        } catch (Exception ex) {
            log.warn("Skip cancelExpiredDeferredTickets: {}", ex.getMessage());
        }
    }

    @Scheduled(fixedDelayString = "${app.booking.deferred-reminder-check-delay-ms:3600000}")
    public void sendPaymentReminders() {
        try {
            List<VeXe> deferred = veXeRepository.findAllByTrangThaiWithTrip(TicketStatus.DAT_TRUOC);
            for (VeXe ve : deferred) {
                if (ve.getHanThanhToan() == null || Instant.now().isAfter(ve.getHanThanhToan())) {
                    continue;
                }
                long daysLeft = deferredBookingPolicy.daysUntilDeadline(ve.getHanThanhToan());
                if (!REMINDER_DAYS.contains(daysLeft)) {
                    continue;
                }
                String loaiNhac = daysLeft + "_DAY";
                if (veNhacThanhToanRepository.existsByVeXeIdAndLoaiNhac(ve.getId(), loaiNhac)) {
                    continue;
                }
                KhachHang kh = khachHangRepository.findById(ve.getKhachHangId()).orElse(null);
                if (kh == null) {
                    continue;
                }
                bookingNotificationService.sendPaymentReminder(kh, ve, daysLeft);
                customerNotificationService.notifyPaymentReminder(kh, ve, daysLeft);
                VeNhacThanhToan mark = new VeNhacThanhToan();
                mark.setVeXeId(ve.getId());
                mark.setLoaiNhac(loaiNhac);
                mark.setSentAt(Instant.now());
                veNhacThanhToanRepository.save(mark);
            }
        } catch (Exception ex) {
            log.warn("Skip sendPaymentReminders: {}", ex.getMessage());
        }
    }
}
