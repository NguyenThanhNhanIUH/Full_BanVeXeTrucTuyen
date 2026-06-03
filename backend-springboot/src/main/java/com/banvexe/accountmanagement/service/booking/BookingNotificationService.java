package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.entity.KhachHang;
import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.entity.VeXe;
import com.banvexe.accountmanagement.repository.ChiTietVeRepository;
import com.banvexe.accountmanagement.repository.VeXeRepository;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class BookingNotificationService {

    private static final Logger log = LoggerFactory.getLogger(BookingNotificationService.class);
    private static final DateTimeFormatter INSTANT_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
        .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private final JavaMailSender mailSender;
    private final VeXeRepository veXeRepository;
    private final ChiTietVeRepository chiTietVeRepository;
    private final String fromEmail;
    private final String brandName;
    private final String logoUrl;
    private final String hotline;
    private final String supportEmail;
    private final String primaryColor;
    private final String secondaryColor;
    private final String successColor;
    private final String websiteUrl;
    private final String ticketLookupUrl;
    private final String historyUrl;
    private final String fromName;
    private final String mailjetApiKey;
    private final String mailjetSecretKey;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public BookingNotificationService(
        JavaMailSender mailSender,
        VeXeRepository veXeRepository,
        ChiTietVeRepository chiTietVeRepository,
        @Value("${spring.mail.username:no-reply@banvexe.local}") String fromEmail,
        @Value("${app.mail.from-name:BanVeXe}") String fromName,
        @Value("${app.mail.mailjet.api-key:}") String mailjetApiKey,
        @Value("${app.mail.mailjet.secret-key:}") String mailjetSecretKey,
        @Value("${app.booking.brand.name:BanVeXe}") String brandName,
        @Value("${app.booking.brand.logo-url:}") String logoUrl,
        @Value("${app.booking.brand.hotline:1900 1234}") String hotline,
        @Value("${app.booking.brand.support-email:support@banvexe.vn}") String supportEmail,
        @Value("${app.booking.brand.primary-color:#ef5222}") String primaryColor,
        @Value("${app.booking.brand.secondary-color:#f97316}") String secondaryColor,
        @Value("${app.booking.brand.success-color:#059669}") String successColor,
        @Value("${app.booking.brand.website-url:http://localhost:5173}") String websiteUrl,
        @Value("${app.booking.brand.ticket-lookup-url:http://localhost:5173/tra-cuu-ve}") String ticketLookupUrl,
        @Value("${app.booking.brand.history-url:http://localhost:5173/lich-su-dat-ve}") String historyUrl
    ) {
        this.mailSender = mailSender;
        this.veXeRepository = veXeRepository;
        this.chiTietVeRepository = chiTietVeRepository;
        this.fromEmail = fromEmail;
        this.brandName = brandName;
        this.logoUrl = logoUrl;
        this.hotline = hotline;
        this.supportEmail = supportEmail;
        this.primaryColor = primaryColor;
        this.secondaryColor = secondaryColor;
        this.successColor = successColor;
        this.websiteUrl = websiteUrl;
        this.ticketLookupUrl = ticketLookupUrl;
        this.historyUrl = historyUrl;
        this.fromName = fromName;
        this.mailjetApiKey = mailjetApiKey;
        this.mailjetSecretKey = mailjetSecretKey;
    }

    public void sendBookingSuccess(KhachHang khach, VeXe ticket) {
        String toEmail = khach != null ? khach.getEmail() : null;
        String fullName = khach != null ? khach.getFullName() : null;
        if (!isValidEmail(toEmail)) return;
        List<TicketEmailRow> rows = collectRows(List.of(ticket));
        BigDecimal total = rows.stream().map(TicketEmailRow::tongTien).reduce(BigDecimal.ZERO, BigDecimal::add);
        String subject = "[BanVeXe] Xác nhận đặt vé thành công - " + safe(ticket.getMaVe());
        String body = buildBookingSuccessHtml(fullName, rows, total);
        sendSafe(toEmail, subject, body);
    }

    public void sendDeferredBookingSuccess(KhachHang khach, VeXe ticket, Instant hanThanhToan) {
        String toEmail = khach != null ? khach.getEmail() : null;
        String fullName = khach != null ? khach.getFullName() : null;
        if (!isValidEmail(toEmail)) return;
        List<TicketEmailRow> rows = collectRows(List.of(ticket));
        BigDecimal total = rows.stream().map(TicketEmailRow::tongTien).reduce(BigDecimal.ZERO, BigDecimal::add);
        String deadline = hanThanhToan != null ? INSTANT_FMT.format(hanThanhToan) : "—";
        String subject = "[BanVeXe] Đặt trước thành công - " + safe(ticket.getMaVe());
        String body = buildDeferredBookingHtml(fullName, rows, total, deadline);
        sendSafe(toEmail, subject, body);
    }

    public void sendPaymentReminder(KhachHang khach, VeXe ticket, long daysLeft) {
        String toEmail = khach != null ? khach.getEmail() : null;
        String fullName = khach != null ? khach.getFullName() : null;
        if (!isValidEmail(toEmail)) return;
        List<TicketEmailRow> rows = collectRows(List.of(ticket));
        String deadline = ticket.getHanThanhToan() != null ? INSTANT_FMT.format(ticket.getHanThanhToan()) : "—";
        String subject = "[BanVeXe] Nhắc thanh toán vé - còn " + daysLeft + " ngày";
        String body = buildPaymentReminderHtml(fullName, rows, daysLeft, deadline);
        sendSafe(toEmail, subject, body);
    }

    public void sendPaymentSuccess(KhachHang khach, List<VeXe> tickets, String paymentRef) {
        String toEmail = khach != null ? khach.getEmail() : null;
        String fullName = khach != null ? khach.getFullName() : null;
        if (!isValidEmail(toEmail) || tickets == null || tickets.isEmpty()) return;
        List<TicketEmailRow> rows = collectRows(tickets);
        BigDecimal total = rows.stream().map(TicketEmailRow::tongTien).reduce(BigDecimal.ZERO, BigDecimal::add);

        String subject = "[BanVeXe] Xác nhận thanh toán thành công";
        String body = buildPaymentSuccessHtml(fullName, rows, paymentRef, total);
        sendSafe(toEmail, subject, body);
    }

    @SuppressWarnings("null")
    private void sendSafe(String to, String subject, String htmlBody) {
        try {
            String from = fromEmail == null || fromEmail.isBlank() ? "no-reply@banvexe.local" : fromEmail;
            String mailTo = to == null ? "" : to;
            String mailSubject = subject == null ? "" : subject;
            String mailBody = htmlBody == null ? "" : htmlBody;
            if (isMailjetApiConfigured()) {
                sendViaMailjetApi(from, mailTo, mailSubject, mailBody);
                return;
            }
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(from);
            helper.setTo(mailTo);
            helper.setSubject(mailSubject);
            helper.setText(mailBody, true);
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Khong gui duoc email toi {}: {}", to, ex.getMessage());
        }
    }

    private boolean isMailjetApiConfigured() {
        return mailjetApiKey != null && !mailjetApiKey.isBlank() && mailjetSecretKey != null && !mailjetSecretKey.isBlank();
    }

    private void sendViaMailjetApi(String from, String to, String subject, String htmlBody) throws IOException, InterruptedException {
        String jsonBody = "{"
            + "\"Messages\":[{"
            + "\"From\":{\"Email\":\"" + jsonEscape(from) + "\",\"Name\":\"" + jsonEscape(fromName) + "\"},"
            + "\"To\":[{\"Email\":\"" + jsonEscape(to) + "\"}],"
            + "\"Subject\":\"" + jsonEscape(subject) + "\","
            + "\"HTMLPart\":\"" + jsonEscape(htmlBody) + "\""
            + "}]"
            + "}";

        String authToken = java.util.Base64.getEncoder()
            .encodeToString((mailjetApiKey + ":" + mailjetSecretKey).getBytes(java.nio.charset.StandardCharsets.UTF_8));

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.mailjet.com/v3.1/send"))
            .header("Content-Type", "application/json")
            .header("Authorization", "Basic " + authToken)
            .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("Mailjet API error " + response.statusCode() + ": " + response.body());
        }
    }

    private static String jsonEscape(String value) {
        if (value == null) return "";
        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r");
    }

    private String buildBookingSuccessHtml(String fullName, List<TicketEmailRow> rows, BigDecimal total) {
        String ngayDat = INSTANT_FMT.format(Instant.now());
        String summary = buildTripSummary(rows);
        String ticketTable = buildTicketTableRows(rows);

        return """
            <div style="margin:0;padding:24px;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
              <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,%s,%s);padding:20px 24px;color:#ffffff;">
                  %s
                  <h2 style="margin:0;font-size:22px;">Xác nhận đặt vé thành công</h2>
                  <p style="margin:8px 0 0 0;font-size:14px;opacity:.95;">Cảm ơn bạn đã đặt vé tại hệ thống %s.</p>
                </div>
                <div style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-size:15px;">Xin chào <strong>%s</strong>,</p>
                  <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;">
                    Đơn đặt vé của bạn đã được tạo thành công và đang ở trạng thái <strong>chờ thanh toán</strong>.
                    Vui lòng hoàn tất thanh toán trong thời gian giữ chỗ để tránh hệ thống tự động hủy vé.
                  </p>
                  <table style="width:100%%;border-collapse:collapse;font-size:14px;">
                    %s
                    <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Thời gian đặt</strong></td><td style="padding:10px;border:1px solid #e5e7eb;">%s</td></tr>
                    <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Tổng tiền</strong></td><td style="padding:10px;border:1px solid #e5e7eb;color:#065f46;"><strong>%s</strong></td></tr>
                  </table>
                  <div style="margin-top:14px;padding:10px;background:#f9fafb;border:1px dashed #d1d5db;border-radius:8px;font-size:13px;color:#374151;">
                    %s
                  </div>
                  <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
                    <a href="%s" style="display:inline-block;background:%s;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;">Tra cứu vé</a>
                    <a href="%s" style="display:inline-block;background:#ffffff;color:%s;text-decoration:none;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;border:1px solid %s;">Lịch sử đặt vé</a>
                  </div>
                  <div style="margin-top:16px;overflow:auto;">
                    <table style="width:100%%;border-collapse:collapse;font-size:13px;">
                      <thead>
                        <tr style="background:#fff7ed;">
                          <th style="border:1px solid #e5e7eb;padding:8px;">Trạng thái</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;">Tuyến</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;">Đi từ</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;">Đến</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;">Ngày đi</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;">Giờ đi</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;">Ghế</th>
                        </tr>
                      </thead>
                      <tbody>%s</tbody>
                    </table>
                  </div>
                  <p style="margin:18px 0 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
                    Nếu bạn không thực hiện giao dịch này, vui lòng liên hệ bộ phận hỗ trợ ngay để được kiểm tra.
                  </p>
                </div>
                <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
                  <div><strong>%s</strong> | Hotline: %s | Email hỗ trợ: %s</div>
                  <div style="margin-top:4px;">Website: <a href="%s" style="color:%s;text-decoration:none;">%s</a></div>
                  <div style="margin-top:4px;">Email tự động từ hệ thống %s. Vui lòng không trả lời email này.</div>
                </div>
              </div>
            </div>
            """.formatted(
            safeColor(primaryColor),
            safeColor(secondaryColor),
            logoBlock(),
            safe(brandName),
            safe(fullName),
            buildMainInfoRows(rows),
            ngayDat,
            formatCurrency(total),
            summary,
            safeUrl(ticketLookupUrl),
            safeColor(primaryColor),
            safeUrl(historyUrl),
            safeColor(primaryColor),
            safeColor(primaryColor),
            ticketTable,
            safe(brandName),
            safe(hotline),
            safe(supportEmail),
            safeUrl(websiteUrl),
            safeColor(primaryColor),
            safeUrl(websiteUrl),
            safe(brandName)
        );
    }

    private String buildPaymentSuccessHtml(String fullName, List<TicketEmailRow> rows, String paymentRef, BigDecimal total) {
        String summary = buildTripSummary(rows);
        String ticketTable = buildTicketTableRows(rows);
        return """
            <div style="margin:0;padding:24px;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
              <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,%s,#10b981);padding:20px 24px;color:#ffffff;">
                  %s
                  <h2 style="margin:0;font-size:22px;">Thanh toán thành công</h2>
                  <p style="margin:8px 0 0 0;font-size:14px;opacity:.95;">Giao dịch của bạn đã được ghi nhận.</p>
                </div>
                <div style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-size:15px;">Xin chào <strong>%s</strong>,</p>
                  <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;">
                    Chúng tôi xác nhận bạn đã thanh toán vé thành công. Chi tiết giao dịch như sau:
                  </p>
                  <table style="width:100%%;border-collapse:collapse;font-size:14px;">
                    %s
                    <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Mã giao dịch</strong></td><td style="padding:10px;border:1px solid #e5e7eb;">%s</td></tr>
                    <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Thời gian thanh toán</strong></td><td style="padding:10px;border:1px solid #e5e7eb;">%s</td></tr>
                    <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Tổng thanh toán</strong></td><td style="padding:10px;border:1px solid #e5e7eb;color:#065f46;"><strong>%s</strong></td></tr>
                  </table>
                  <div style="margin-top:14px;padding:10px;background:#f0fdf4;border:1px dashed #86efac;border-radius:8px;font-size:13px;color:#166534;">
                    %s
                  </div>
                  <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
                    <a href="%s" style="display:inline-block;background:%s;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;">Tra cứu vé</a>
                    <a href="%s" style="display:inline-block;background:#ffffff;color:%s;text-decoration:none;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;border:1px solid %s;">Lịch sử đặt vé</a>
                  </div>
                  <div style="margin-top:16px;overflow:auto;">
                    <table style="width:100%%;border-collapse:collapse;font-size:13px;">
                      <thead>
                        <tr style="background:#ecfdf5;">
                          <th style="border:1px solid #e5e7eb;padding:8px;">Trạng thái</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;">Tuyến</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;">Đi từ</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;">Đến</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;">Ngày đi</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;">Giờ đi</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;">Ghế</th>
                        </tr>
                      </thead>
                      <tbody>%s</tbody>
                    </table>
                  </div>
                  <p style="margin:18px 0 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
                    Bạn có thể tra cứu lịch sử vé trong tài khoản hoặc bằng mã vé tại trang tra cứu vé.
                  </p>
                </div>
                <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
                  <div><strong>%s</strong> | Hotline: %s | Email hỗ trợ: %s</div>
                  <div style="margin-top:4px;">Website: <a href="%s" style="color:%s;text-decoration:none;">%s</a></div>
                  <div style="margin-top:4px;">Email tự động từ hệ thống %s. Vui lòng không trả lời email này.</div>
                </div>
              </div>
            </div>
            """.formatted(
            safeColor(successColor),
            logoBlock(),
            safe(fullName),
            buildMainInfoRows(rows),
            safe(paymentRef),
            INSTANT_FMT.format(Instant.now()),
            formatCurrency(total),
            summary,
            safeUrl(ticketLookupUrl),
            safeColor(successColor),
            safeUrl(historyUrl),
            safeColor(successColor),
            safeColor(successColor),
            ticketTable
            ,
            safe(brandName),
            safe(hotline),
            safe(supportEmail),
            safeUrl(websiteUrl),
            safeColor(successColor),
            safeUrl(websiteUrl),
            safe(brandName)
        );
    }

    private String logoBlock() {
        if (logoUrl == null || logoUrl.isBlank()) return "";
        return """
            <div style="margin-bottom:10px;">
              <img src="%s" alt="%s logo" style="height:42px;max-width:180px;object-fit:contain;background:#fff;border-radius:8px;padding:4px;" />
            </div>
            """.formatted(safeUrl(logoUrl), safe(brandName));
    }

    private List<TicketEmailRow> collectRows(List<VeXe> tickets) {
        return tickets.stream()
            .map(v -> veXeRepository.findByIdWithDetails(v.getId()).orElse(v))
            .map(v -> {
                String ghe = chiTietVeRepository.findByVeXeId(v.getId()).stream()
                    .map(ct -> ct.getSoGhe())
                    .filter(s -> s != null && !s.isBlank())
                    .sorted()
                    .collect(Collectors.joining(", "));
                String tenTuyen = v.getChuyenXe() != null && v.getChuyenXe().getTuyenXe() != null
                    ? safe(v.getChuyenXe().getTuyenXe().getTenTuyen()) : "(Đang cập nhật)";
                String diemDi = v.getChuyenXe() != null && v.getChuyenXe().getTuyenXe() != null
                    ? safe(v.getChuyenXe().getTuyenXe().getDiemDi()) : "(Đang cập nhật)";
                String diemDen = v.getChuyenXe() != null && v.getChuyenXe().getTuyenXe() != null
                    ? safe(v.getChuyenXe().getTuyenXe().getDiemDen()) : "(Đang cập nhật)";
                String ngayDi = v.getChuyenXe() != null && v.getChuyenXe().getNgayDi() != null
                    ? v.getChuyenXe().getNgayDi().format(DATE_FMT) : "(Đang cập nhật)";
                String gioDi = v.getChuyenXe() != null && v.getChuyenXe().getGioDi() != null
                    ? v.getChuyenXe().getGioDi().format(TIME_FMT) : "(Đang cập nhật)";
                LocalDate ngayDiRaw = v.getChuyenXe() != null ? v.getChuyenXe().getNgayDi() : null;
                return new TicketEmailRow(
                    safe(v.getMaVe()),
                    mapStatus(v.getTrangThai()),
                    tenTuyen,
                    diemDi,
                    diemDen,
                    ngayDi,
                    gioDi,
                    ghe.isBlank() ? "(Chưa có ghế)" : ghe,
                    v.getTongTien() == null ? BigDecimal.ZERO : v.getTongTien(),
                    ngayDiRaw
                );
            })
            .sorted(Comparator.comparing(TicketEmailRow::ngayDiRaw, Comparator.nullsLast(Comparator.naturalOrder())))
            .toList();
    }

    private String buildMainInfoRows(List<TicketEmailRow> rows) {
        String maVeJoined = rows.stream().map(TicketEmailRow::maVe).distinct().collect(Collectors.joining(", "));
        String ngayDi = rows.stream().map(TicketEmailRow::ngayDi).findFirst().orElse("(Đang cập nhật)");
        String ngayVe = resolveNgayVe(rows);
        return """
            <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f9fafb;width:34%%;"><strong>Mã vé</strong></td><td style="padding:10px;border:1px solid #e5e7eb;">%s</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Ngày đi</strong></td><td style="padding:10px;border:1px solid #e5e7eb;">%s</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Ngày về</strong></td><td style="padding:10px;border:1px solid #e5e7eb;">%s</td></tr>
            """.formatted(
            maVeJoined.isBlank() ? "(Không có)" : maVeJoined,
            ngayDi,
            ngayVe
        );
    }

    private String resolveNgayVe(List<TicketEmailRow> rows) {
        List<LocalDate> dates = rows.stream()
            .map(TicketEmailRow::ngayDiRaw)
            .filter(d -> d != null)
            .distinct()
            .sorted()
            .toList();
        if (dates.size() < 2) return "Không áp dụng (vé một chiều)";
        return dates.get(1).format(DATE_FMT);
    }

    private String buildTripSummary(List<TicketEmailRow> rows) {
        if (rows.isEmpty()) return "Không có dữ liệu chuyến.";
        TicketEmailRow first = rows.get(0);
        String line = "Tuyến: " + first.tenTuyen() + " | Đi từ: " + first.diemDi() + " | Đến: " + first.diemDen();
        String ngayVe = resolveNgayVe(rows);
        return line + " | Ngày đi: " + first.ngayDi() + " | Ngày về: " + ngayVe;
    }

    private String buildTicketTableRows(List<TicketEmailRow> rows) {
        return rows.stream()
            .map(row -> """
                <tr>
                  <td style="border:1px solid #e5e7eb;padding:8px;">%s</td>
                  <td style="border:1px solid #e5e7eb;padding:8px;">%s</td>
                  <td style="border:1px solid #e5e7eb;padding:8px;">%s</td>
                  <td style="border:1px solid #e5e7eb;padding:8px;">%s</td>
                  <td style="border:1px solid #e5e7eb;padding:8px;">%s</td>
                  <td style="border:1px solid #e5e7eb;padding:8px;">%s</td>
                  <td style="border:1px solid #e5e7eb;padding:8px;">%s</td>
                </tr>
                """.formatted(
                row.trangThai(), row.tenTuyen(), row.diemDi(), row.diemDen(), row.ngayDi(), row.gioDi(), row.ghe()
            ))
            .collect(Collectors.joining());
    }

    private String buildDeferredBookingHtml(String fullName, List<TicketEmailRow> rows, BigDecimal total, String deadline) {
        String ticketTable = buildTicketTableRows(rows);
        return """
            <div style="margin:0;padding:24px;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
              <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,%s,%s);padding:20px 24px;color:#ffffff;">
                  %s
                  <h2 style="margin:0;font-size:22px;">Đặt trước thành công</h2>
                  <p style="margin:8px 0 0 0;font-size:14px;opacity:.95;">Ghế đã được giữ cho bạn.</p>
                </div>
                <div style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-size:15px;">Xin chào <strong>%s</strong>,</p>
                  <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;">
                    Vé của bạn đang ở trạng thái <strong>đặt trước</strong>. Hạn thanh toán: <strong>%s</strong>.
                    Hệ thống sẽ gửi email và thông báo tài khoản nhắc bạn trước ngày đến hạn.
                  </p>
                  <p style="margin:0 0 12px 0;font-size:15px;">Tổng tiền: <strong style="color:#065f46;">%s</strong></p>
                  <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
                    <a href="%s" style="display:inline-block;background:%s;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;">Thanh toán / tra cứu vé</a>
                    <a href="%s" style="display:inline-block;background:#ffffff;color:%s;text-decoration:none;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;border:1px solid %s;">Lịch sử đặt vé</a>
                  </div>
                  <div style="margin-top:16px;overflow:auto;">
                    <table style="width:100%%;border-collapse:collapse;font-size:13px;">
                      <thead><tr style="background:#fff7ed;">
                        <th style="border:1px solid #e5e7eb;padding:8px;">Tuyến</th>
                        <th style="border:1px solid #e5e7eb;padding:8px;">Ngày đi</th>
                        <th style="border:1px solid #e5e7eb;padding:8px;">Ghế</th>
                      </tr></thead>
                      <tbody>%s</tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            """.formatted(
            safeColor(primaryColor),
            safeColor(secondaryColor),
            logoBlock(),
            safe(fullName),
            deadline,
            formatCurrency(total),
            safeUrl(ticketLookupUrl),
            safeColor(primaryColor),
            safeUrl(historyUrl),
            safeColor(primaryColor),
            safeColor(primaryColor),
            ticketTable
        );
    }

    private String buildPaymentReminderHtml(String fullName, List<TicketEmailRow> rows, long daysLeft, String deadline) {
        String ticketTable = buildTicketTableRows(rows);
        return """
            <div style="margin:0;padding:24px;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
              <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#f59e0b,#ef5222);padding:20px 24px;color:#ffffff;">
                  %s
                  <h2 style="margin:0;font-size:22px;">Nhắc thanh toán vé</h2>
                  <p style="margin:8px 0 0 0;font-size:14px;opacity:.95;">Còn %d ngày đến hạn thanh toán.</p>
                </div>
                <div style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-size:15px;">Xin chào <strong>%s</strong>,</p>
                  <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;">
                    Vé đặt trước của bạn sắp đến hạn thanh toán (<strong>%s</strong>).
                    Vui lòng thanh toán sớm để tránh bị hủy vé và mất ghế.
                  </p>
                  <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
                    <a href="%s" style="display:inline-block;background:%s;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;">Thanh toán ngay</a>
                  </div>
                  <div style="margin-top:16px;overflow:auto;">
                    <table style="width:100%%;border-collapse:collapse;font-size:13px;">
                      <tbody>%s</tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            """.formatted(
            logoBlock(),
            daysLeft,
            safe(fullName),
            deadline,
            safeUrl(historyUrl),
            safeColor(primaryColor),
            ticketTable
        );
    }

    private String mapStatus(TicketStatus status) {
        if (status == null) return "Không xác định";
        return switch (status) {
            case CHO_THANH_TOAN -> "Chờ thanh toán";
            case DAT_TRUOC -> "Đặt trước - chờ thanh toán";
            case DA_THANH_TOAN -> "Đã thanh toán";
            case DANG_XU_LY -> "Đang xử lý";
            case DA_HUY -> "Đã hủy";
            case HOAN_THANH -> "Hoàn thành";
        };
    }

    private String formatCurrency(BigDecimal value) {
        NumberFormat nf = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));
        return nf.format(value == null ? BigDecimal.ZERO : value);
    }

    private boolean isValidEmail(String email) {
        return email != null && !email.isBlank() && email.contains("@");
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "(khong co)" : value;
    }

    private String safeUrl(String value) {
        return value == null || value.isBlank() ? "#" : value;
    }

    private String safeColor(String value) {
        return value == null || value.isBlank() ? "#ef5222" : value;
    }

    private record TicketEmailRow(
        String maVe,
        String trangThai,
        String tenTuyen,
        String diemDi,
        String diemDen,
        String ngayDi,
        String gioDi,
        String ghe,
        BigDecimal tongTien,
        LocalDate ngayDiRaw
    ) {
    }
}
