package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.dto.booking.DailyRevenuePointDto;
import com.banvexe.accountmanagement.dto.booking.MonthlyRevenuePointDto;
import com.banvexe.accountmanagement.dto.booking.RevenueByRouteReportDto;
import com.banvexe.accountmanagement.dto.booking.RevenueDailyReportDto;
import com.banvexe.accountmanagement.dto.booking.RouteRevenuePointDto;
import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.repository.VeXeRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RevenueReportService {

    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final List<TicketStatus> PAID_STATUSES = List.of(TicketStatus.DA_THANH_TOAN, TicketStatus.HOAN_THANH);

    private final VeXeRepository veXeRepository;

    public RevenueReportService(VeXeRepository veXeRepository) {
        this.veXeRepository = veXeRepository;
    }

    private List<Object[]> loadPaidTicketMoneyRows() {
        return veXeRepository.findNgayDatAndTongTienByTrangThaiIn(PAID_STATUSES);
    }

    private Instant monthStartInclusive(YearMonth yearMonth) {
        return yearMonth.atDay(1).atStartOfDay(VN).toInstant();
    }

    private Instant monthEndExclusive(YearMonth yearMonth) {
        return yearMonth.plusMonths(1).atDay(1).atStartOfDay(VN).toInstant();
    }

    private String buildRouteShortLabel(String tenTuyen, String diemDi, String diemDen) {
        if (tenTuyen != null && !tenTuyen.isBlank()) {
            String trimmed = tenTuyen.trim();
            return trimmed.length() > 28 ? trimmed.substring(0, 25) + "…" : trimmed;
        }
        String from = diemDi != null ? diemDi.trim() : "?";
        String to = diemDen != null ? diemDen.trim() : "?";
        String label = from + " → " + to;
        return label.length() > 32 ? label.substring(0, 29) + "…" : label;
    }

    @Transactional(readOnly = true)
    public List<MonthlyRevenuePointDto> listMonthsWithRevenue() {
        List<Object[]> rows = loadPaidTicketMoneyRows();
        Map<YearMonth, BigDecimal> revenueByMonth = new TreeMap<>();
        Map<YearMonth, Long> countByMonth = new TreeMap<>();

        for (Object[] row : rows) {
            if (row == null || row.length < 2) {
                continue;
            }
            Instant ngay = (Instant) row[0];
            if (ngay == null) {
                continue;
            }
            BigDecimal money = row[1] instanceof BigDecimal bd ? bd : BigDecimal.ZERO;
            YearMonth ym = YearMonth.from(ngay.atZone(VN));
            revenueByMonth.merge(ym, money, BigDecimal::add);
            countByMonth.merge(ym, 1L, Long::sum);
        }

        List<YearMonth> sorted = new ArrayList<>(revenueByMonth.keySet());
        sorted.sort(Comparator.reverseOrder());

        List<MonthlyRevenuePointDto> out = new ArrayList<>();
        for (YearMonth ym : sorted) {
            BigDecimal rev = revenueByMonth.get(ym);
            long cnt = countByMonth.getOrDefault(ym, 0L);
            String label = "Tháng " + ym.getMonthValue() + "/" + ym.getYear();
            out.add(new MonthlyRevenuePointDto(
                ym.getYear(),
                ym.getMonthValue(),
                ym.toString(),
                label,
                cnt,
                rev != null ? rev : BigDecimal.ZERO
            ));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public RevenueDailyReportDto buildDailyReport(YearMonth yearMonth) {
        List<Object[]> rows = loadPaidTicketMoneyRows();
        Map<LocalDate, BigDecimal> revenueByDay = new LinkedHashMap<>();
        Map<LocalDate, Long> countByDay = new LinkedHashMap<>();

        for (Object[] row : rows) {
            if (row == null || row.length < 2) {
                continue;
            }
            Instant ngay = (Instant) row[0];
            if (ngay == null) {
                continue;
            }
            LocalDate d = ngay.atZone(VN).toLocalDate();
            if (!YearMonth.from(d).equals(yearMonth)) {
                continue;
            }
            BigDecimal money = row[1] instanceof BigDecimal bd ? bd : BigDecimal.ZERO;
            revenueByDay.merge(d, money, BigDecimal::add);
            countByDay.merge(d, 1L, Long::sum);
        }

        int len = yearMonth.lengthOfMonth();
        List<DailyRevenuePointDto> days = new ArrayList<>(len);
        BigDecimal monthRevenue = BigDecimal.ZERO;
        long monthTickets = 0;

        for (int dom = 1; dom <= len; dom++) {
            LocalDate d = yearMonth.atDay(dom);
            BigDecimal rev = revenueByDay.getOrDefault(d, BigDecimal.ZERO);
            long cnt = countByDay.getOrDefault(d, 0L);
            monthRevenue = monthRevenue.add(rev);
            monthTickets += cnt;
            String dateKey = d.toString();
            String label = d.getDayOfMonth() + "/" + d.getMonthValue();
            days.add(new DailyRevenuePointDto(dom, dateKey, label, cnt, rev));
        }

        String monthLabel = "Tháng " + yearMonth.getMonthValue() + "/" + yearMonth.getYear();
        return new RevenueDailyReportDto(
            yearMonth.toString(),
            monthLabel,
            Collections.unmodifiableList(days),
            monthTickets,
            monthRevenue
        );
    }

    @Transactional(readOnly = true)
    public RevenueByRouteReportDto buildRouteReport(YearMonth yearMonth) {
        List<Object[]> rows = veXeRepository.sumRevenueByRouteBetween(
            PAID_STATUSES,
            monthStartInclusive(yearMonth),
            monthEndExclusive(yearMonth)
        );

        List<RouteRevenuePointDto> routes = new ArrayList<>();
        BigDecimal totalRevenue = BigDecimal.ZERO;
        long totalTickets = 0;

        for (Object[] row : rows) {
            if (row == null || row.length < 6) {
                continue;
            }
            Integer routeId = row[0] instanceof Number n ? n.intValue() : null;
            String tenTuyen = row[1] != null ? row[1].toString() : "";
            String diemDi = row[2] != null ? row[2].toString() : "";
            String diemDen = row[3] != null ? row[3].toString() : "";
            long ticketCount = row[4] instanceof Number n ? n.longValue() : 0L;
            BigDecimal revenue = row[5] instanceof BigDecimal bd ? bd : BigDecimal.ZERO;

            totalTickets += ticketCount;
            totalRevenue = totalRevenue.add(revenue);
            routes.add(new RouteRevenuePointDto(
                routeId,
                tenTuyen,
                diemDi,
                diemDen,
                buildRouteShortLabel(tenTuyen, diemDi, diemDen),
                ticketCount,
                revenue,
                0.0
            ));
        }

        if (totalRevenue.compareTo(BigDecimal.ZERO) > 0) {
            List<RouteRevenuePointDto> withShare = new ArrayList<>(routes.size());
            for (RouteRevenuePointDto route : routes) {
                double share = route.revenue()
                    .multiply(BigDecimal.valueOf(100))
                    .divide(totalRevenue, 2, RoundingMode.HALF_UP)
                    .doubleValue();
                withShare.add(new RouteRevenuePointDto(
                    route.routeId(),
                    route.tenTuyen(),
                    route.diemDi(),
                    route.diemDen(),
                    route.shortLabel(),
                    route.ticketCount(),
                    route.revenue(),
                    share
                ));
            }
            routes = withShare;
        }

        String monthLabel = "Tháng " + yearMonth.getMonthValue() + "/" + yearMonth.getYear();
        return new RevenueByRouteReportDto(
            yearMonth.toString(),
            monthLabel,
            Collections.unmodifiableList(routes),
            totalTickets,
            totalRevenue
        );
    }
}
