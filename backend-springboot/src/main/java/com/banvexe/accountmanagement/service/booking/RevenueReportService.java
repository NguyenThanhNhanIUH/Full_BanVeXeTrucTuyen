package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.dto.booking.DailyRevenuePointDto;
import com.banvexe.accountmanagement.dto.booking.MonthlyRevenuePointDto;
import com.banvexe.accountmanagement.dto.booking.RevenueDailyReportDto;
import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.repository.VeXeRepository;
import java.math.BigDecimal;
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

    private final VeXeRepository veXeRepository;

    public RevenueReportService(VeXeRepository veXeRepository) {
        this.veXeRepository = veXeRepository;
    }

    private List<Object[]> loadPaidTicketMoneyRows() {
        return veXeRepository.findNgayDatAndTongTienByTrangThaiIn(
            List.of(TicketStatus.DA_THANH_TOAN, TicketStatus.HOAN_THANH));
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
}
