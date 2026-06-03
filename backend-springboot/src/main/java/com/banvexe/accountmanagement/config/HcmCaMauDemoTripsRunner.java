package com.banvexe.accountmanagement.config;

import com.banvexe.accountmanagement.entity.ChuyenXe;
import com.banvexe.accountmanagement.entity.TripRunStatus;
import com.banvexe.accountmanagement.entity.TuyenXe;
import com.banvexe.accountmanagement.entity.Xe;
import com.banvexe.accountmanagement.repository.ChuyenXeRepository;
import com.banvexe.accountmanagement.repository.TuyenXeRepository;
import com.banvexe.accountmanagement.repository.XeRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;

@Component
public class HcmCaMauDemoTripsRunner implements ApplicationRunner, Ordered {

    private static final Logger log = LoggerFactory.getLogger(HcmCaMauDemoTripsRunner.class);
    private static final LocalDate DEMO_DATE = LocalDate.of(2026, 6, 5);

    private final TuyenXeRepository tuyenXeRepository;
    private final XeRepository xeRepository;
    private final ChuyenXeRepository chuyenXeRepository;

    public HcmCaMauDemoTripsRunner(
        TuyenXeRepository tuyenXeRepository,
        XeRepository xeRepository,
        ChuyenXeRepository chuyenXeRepository
    ) {
        this.tuyenXeRepository = tuyenXeRepository;
        this.xeRepository = xeRepository;
        this.chuyenXeRepository = chuyenXeRepository;
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            TuyenXe route = tuyenXeRepository.searchRoutes(
                com.banvexe.accountmanagement.entity.RouteStatus.ACTIVE,
                "%Hồ Chí Minh%",
                "%Cà Mau%"
            ).stream()
                .filter(t -> t.getDiemDi() != null && t.getDiemDi().contains("Hồ Chí Minh"))
                .filter(t -> t.getDiemDen() != null && t.getDiemDen().contains("Cà Mau"))
                .findFirst()
                .orElse(null);
            if (route == null) {
                log.info("Skip demo trips seed: route TP.HCM -> Cà Mau not found.");
                return;
            }

            long existing = chuyenXeRepository.searchTrips(
                com.banvexe.accountmanagement.entity.RouteStatus.ACTIVE,
                TripRunStatus.CHUA_KHOI_HANH,
                "%Hồ Chí Minh%",
                "%Cà Mau%",
                DEMO_DATE,
                LocalDate.now().minusYears(1)
            ).size();
            if (existing > 0) {
                log.info("Demo trips for {} on route #{} already exist ({} chuyến).", DEMO_DATE, route.getId(), existing);
                return;
            }

            List<Xe> vehicles = xeRepository.findAll();
            if (vehicles.isEmpty()) {
                log.warn("Skip demo trips seed: no vehicles in DB.");
                return;
            }

            BigDecimal giaVe = route.getGiaVeCoBan() != null ? route.getGiaVeCoBan() : BigDecimal.valueOf(220000);
            int created = 0;
            for (int hour = 0; hour < 24; hour++) {
                Xe xe = vehicles.get(hour % vehicles.size());
                ChuyenXe trip = new ChuyenXe();
                trip.setTuyenXe(route);
                trip.setXe(xe);
                trip.setNgayDi(DEMO_DATE);
                trip.setGioDi(LocalTime.of(hour, 0));
                trip.setGiaVe(giaVe);
                trip.setTrangThai(TripRunStatus.CHUA_KHOI_HANH);
                chuyenXeRepository.save(trip);
                created++;
            }
            log.info("Seeded {} demo trips TP.HCM -> Cà Mau on {} (route #{}).", created, DEMO_DATE, route.getId());
        } catch (Exception ex) {
            log.warn("Skip demo trips seed: {}", ex.getMessage());
        }
    }
}
