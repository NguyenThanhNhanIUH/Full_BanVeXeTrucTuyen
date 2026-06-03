package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.entity.VeXe;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class BookingHoldPolicy {

    private final long holdMinutes;

    public BookingHoldPolicy(@Value("${app.booking.hold-minutes:5}") long holdMinutes) {
        this.holdMinutes = Math.max(1, holdMinutes);
    }

    public long holdMinutes() {
        return holdMinutes;
    }

    public Instant holdExpiresAt(VeXe ve) {
        if (ve == null) {
            return null;
        }
        if (ve.getTrangThai() == TicketStatus.DAT_TRUOC) {
            return ve.getHanThanhToan();
        }
        if (ve.getNgayDat() == null || ve.getTrangThai() != TicketStatus.CHO_THANH_TOAN) {
            return null;
        }
        return ve.getNgayDat().plus(holdMinutes, ChronoUnit.MINUTES);
    }

    public boolean isHoldExpired(VeXe ve) {
        Instant expiresAt = holdExpiresAt(ve);
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }

    public void assertHoldActive(VeXe ve) {
        if (ve == null) {
            throw new ResponseStatusException(HttpStatus.GONE, "Vé không hợp lệ.");
        }
        if (ve.getTrangThai() == TicketStatus.DAT_TRUOC) {
            Instant deadline = ve.getHanThanhToan();
            if (deadline == null || Instant.now().isAfter(deadline)) {
                throw new ResponseStatusException(
                    HttpStatus.GONE,
                    "Vé đặt trước đã quá hạn thanh toán. Vui lòng đặt lại."
                );
            }
            return;
        }
        if (isHoldExpired(ve)) {
            throw new ResponseStatusException(
                HttpStatus.GONE,
                "Vé đã hết thời gian giữ chỗ (" + holdMinutes + " phút). Vui lòng đặt lại."
            );
        }
    }

    public boolean isPendingPayment(VeXe ve) {
        return ve != null && (ve.getTrangThai() == TicketStatus.CHO_THANH_TOAN || ve.getTrangThai() == TicketStatus.DAT_TRUOC);
    }
}
