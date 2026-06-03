package com.banvexe.accountmanagement.service.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.entity.VeXe;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class BookingHoldPolicyTest {

    private final BookingHoldPolicy policy = new BookingHoldPolicy(5);

    @Test
    void holdExpiresAt_returnsNullForPaidTicket() {
        VeXe ve = new VeXe();
        ve.setTrangThai(TicketStatus.DA_THANH_TOAN);
        ve.setNgayDat(Instant.now());

        assertThat(policy.holdExpiresAt(ve)).isNull();
    }

    @Test
    void holdExpiresAt_addsHoldMinutesToBookingTime() {
        Instant bookedAt = Instant.parse("2026-06-03T10:00:00Z");
        VeXe ve = new VeXe();
        ve.setTrangThai(TicketStatus.CHO_THANH_TOAN);
        ve.setNgayDat(bookedAt);

        assertThat(policy.holdExpiresAt(ve)).isEqualTo(bookedAt.plus(5, ChronoUnit.MINUTES));
    }

    @Test
    void assertHoldActive_rejectsExpiredHold() {
        VeXe ve = new VeXe();
        ve.setTrangThai(TicketStatus.CHO_THANH_TOAN);
        ve.setNgayDat(Instant.now().minus(6, ChronoUnit.MINUTES));

        assertThatThrownBy(() -> policy.assertHoldActive(ve))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("hết thời gian giữ chỗ");
    }

    @Test
    void assertHoldActive_allowsActiveHold() {
        VeXe ve = new VeXe();
        ve.setTrangThai(TicketStatus.CHO_THANH_TOAN);
        ve.setNgayDat(Instant.now());

        policy.assertHoldActive(ve);
    }
}
