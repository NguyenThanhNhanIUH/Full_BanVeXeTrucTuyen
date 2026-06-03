package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.entity.ChuyenXe;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class DeferredBookingPolicy {

    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private final int payDaysBefore;

    public DeferredBookingPolicy(@Value("${app.booking.deferred-pay-days-before:3}") int payDaysBefore) {
        this.payDaysBefore = Math.max(1, payDaysBefore);
    }

    public int payDaysBefore() {
        return payDaysBefore;
    }

    public Instant computePaymentDeadline(ChuyenXe chuyen) {
        ZonedDateTime dep = ZonedDateTime.of(chuyen.getNgayDi(), chuyen.getGioDi(), VN);
        return dep.minusDays(payDaysBefore).toInstant();
    }

    public void assertEligibleForDeferred(ChuyenXe chuyen) {
        ZonedDateTime dep = ZonedDateTime.of(chuyen.getNgayDi(), chuyen.getGioDi(), VN);
        ZonedDateTime minDep = ZonedDateTime.now(VN).plusDays(payDaysBefore + 1L);
        if (!dep.isAfter(minDep)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Chuyến quá gần, không thể đặt trước. Vui lòng chọn thanh toán ngay hoặc chọn chuyến khác."
            );
        }
    }

    public long daysUntilDeadline(Instant hanThanhToan) {
        if (hanThanhToan == null) {
            return Long.MAX_VALUE;
        }
        var today = Instant.now().atZone(VN).toLocalDate();
        var deadline = hanThanhToan.atZone(VN).toLocalDate();
        return ChronoUnit.DAYS.between(today, deadline);
    }
}
