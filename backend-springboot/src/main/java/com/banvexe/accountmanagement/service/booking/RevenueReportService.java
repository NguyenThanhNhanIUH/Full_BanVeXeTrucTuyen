package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.dto.booking.MonthlyRevenuePointDto;
import com.banvexe.accountmanagement.dto.booking.RevenueReportDto;
import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.repository.VeXeRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
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

    @Transactional(readOnly = true)
    public RevenueReportDto buildReport() {
        List<Object[]> rows = veXeRepository.findNgayDatAndTongTienByTrangThaiIn(
            List.of(TicketStatus.DA_THANH_TOAN, TicketStatus.HOAN_THANH));

        Map<YearMonth, BigDecimal> revenueByMonth = new TreeMap<>();
        Map<YearMonth, Long> countByMonth = new TreeMap<>();
        BigDecimal totalRevenue = BigDecimal.ZERO;
        long totalTickets = 0;

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
            totalRevenue = totalRevenue.add(money);
            totalTickets++;
        }

        List<MonthlyRevenuePointDto> months = new ArrayList<>();
        for (YearMonth ym : revenueByMonth.keySet()) {
            BigDecimal rev = revenueByMonth.get(ym);
            long cnt = countByMonth.getOrDefault(ym, 0L);
            String label = "Tháng " + ym.getMonthValue() + "/" + ym.getYear();
            months.add(new MonthlyRevenuePointDto(
                ym.getYear(),
                ym.getMonthValue(),
                ym.toString(),
                label,
                cnt,
                rev != null ? rev : BigDecimal.ZERO
            ));
        }

        return new RevenueReportDto(months, totalTickets, totalRevenue);
    }
}
