package com.banvexe.accountmanagement.service.booking;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SeatSelectionHoldScheduler {

    private static final Logger log = LoggerFactory.getLogger(SeatSelectionHoldScheduler.class);

    private final SeatSelectionHoldService seatSelectionHoldService;

    public SeatSelectionHoldScheduler(SeatSelectionHoldService seatSelectionHoldService) {
        this.seatSelectionHoldService = seatSelectionHoldService;
    }

    @Scheduled(fixedDelayString = "${app.booking.select-hold-check-delay-ms:15000}")
    public void purgeExpiredSelectionHolds() {
        try {
            int removed = seatSelectionHoldService.purgeExpired();
            if (removed > 0) {
                log.debug("Purged {} expired temporary seat holds", removed);
            }
        } catch (Exception ex) {
            log.warn("Skip purgeExpiredSelectionHolds: {}", ex.getMessage());
        }
    }
}
