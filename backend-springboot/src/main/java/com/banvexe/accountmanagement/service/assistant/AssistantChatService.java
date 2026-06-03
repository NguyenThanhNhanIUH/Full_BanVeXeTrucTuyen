package com.banvexe.accountmanagement.service.assistant;

import com.banvexe.accountmanagement.dto.assistant.AssistantActionDto;
import com.banvexe.accountmanagement.dto.assistant.AssistantChatResponse;
import com.banvexe.accountmanagement.dto.assistant.AssistantTripCardDto;
import com.banvexe.accountmanagement.dto.booking.TripSummaryDto;
import com.banvexe.accountmanagement.service.booking.BookingCatalogService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AssistantChatService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Map<String, String> LOCATION_ALIASES = Map.ofEntries(
        Map.entry("tphcm", "TP. Hồ Chí Minh"),
        Map.entry("tp hcm", "TP. Hồ Chí Minh"),
        Map.entry("tp.hcm", "TP. Hồ Chí Minh"),
        Map.entry("ho chi minh", "TP. Hồ Chí Minh"),
        Map.entry("hcm", "TP. Hồ Chí Minh"),
        Map.entry("sai gon", "TP. Hồ Chí Minh"),
        Map.entry("sg", "TP. Hồ Chí Minh"),
        Map.entry("ha noi", "Hà Nội"),
        Map.entry("hn", "Hà Nội"),
        Map.entry("da nang", "Đà Nẵng"),
        Map.entry("dn", "Đà Nẵng"),
        Map.entry("ca mau", "Cà Mau"),
        Map.entry("camau", "Cà Mau"),
        Map.entry("da lat", "Đà Lạt"),
        Map.entry("dalat", "Đà Lạt"),
        Map.entry("can tho", "Cần Thơ"),
        Map.entry("cantho", "Cần Thơ"),
        Map.entry("nha trang", "Nha Trang"),
        Map.entry("hue", "Thừa Thiên Huế"),
        Map.entry("thua thien hue", "Thừa Thiên Huế")
    );

    private final BookingCatalogService bookingCatalogService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String apiKey;
    private final String model;

    public AssistantChatService(
        BookingCatalogService bookingCatalogService,
        ObjectMapper objectMapper,
        @Value("${app.gemini.api-key:}") String apiKey,
        @Value("${app.gemini.model:gemini-2.0-flash}") String model
    ) {
        this.bookingCatalogService = bookingCatalogService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.model = model != null && !model.isBlank() ? model.trim() : "gemini-2.0-flash";
    }

    public AssistantChatResponse chat(String question) {
        if (apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Trợ lý AI chưa được cấu hình");
        }

        String trimmed = question == null ? "" : question.trim();
        if (trimmed.isBlank()) {
            return welcomeResponse();
        }

        Optional<AssistantChatResponse> faq = detectFaqAnswer(trimmed);
        if (faq.isPresent()) {
            return faq.get();
        }

        ExtractedQuery query = extractQuery(trimmed);
        if (query.origin() == null || query.origin().isBlank() || query.destination() == null || query.destination().isBlank()) {
            return generalResponse(trimmed);
        }

        String origin = resolveLocation(query.origin(), true);
        String destination = resolveLocation(query.destination(), false);

        List<TripSummaryDto> outbound = bookingCatalogService.searchTrips(origin, destination, query.exactDate(), 1);
        List<TripSummaryDto> outboundFiltered = query.exactDate() != null
            ? sortTrips(outbound)
            : filterByMonth(outbound, query.month(), query.year());

        if (!query.roundTrip()) {
            return buildOneWayResponse(origin, destination, outboundFiltered, query);
        }

        Integer retMonth = query.monthReturn() != null ? query.monthReturn() : query.month();
        Integer retYear = query.yearReturn() != null ? query.yearReturn() : query.year();

        List<TripSummaryDto> inbound = bookingCatalogService.searchTrips(destination, origin, null, 1);
        List<TripSummaryDto> inboundFiltered = filterByMonth(inbound, retMonth, retYear);

        return buildRoundTripResponse(
            origin,
            destination,
            outboundFiltered,
            inboundFiltered,
            query,
            retMonth,
            retYear
        );
    }

    private AssistantChatResponse welcomeResponse() {
        return new AssistantChatResponse(
            "Bạn muốn hỏi gì? Chọn gợi ý bên dưới hoặc nhập câu hỏi nhé.",
            List.of(
                "TP.HCM đi Cà Mau tháng 7/2026",
                "Cách đặt trước thanh toán sau?",
                "Làm sao tra cứu vé?"
            ),
            List.of(),
            List.of(
                navigateAction("/", "Mở trang chủ tìm chuyến"),
                navigateAction("/tra-cuu-ve", "Tra cứu vé"),
                navigateAction("/tai-khoan/lich-su-mua-ve", "Lịch sử mua vé")
            )
        );
    }

    private AssistantChatResponse generalResponse(String question) {
        String answer = answerGeneral(question);
        return new AssistantChatResponse(
            answer,
            List.of(
                "TP.HCM đi Cà Mau tháng 7",
                "Đà Nẵng đi Huế khứ hồi",
                "Cách đặt trước thanh toán sau?"
            ),
            List.of(),
            List.of(
                navigateAction("/", "Tìm chuyến trên trang chủ"),
                navigateAction("/tra-cuu-ve", "Tra cứu vé")
            )
        );
    }

    private AssistantChatResponse buildOneWayResponse(
        String origin,
        String destination,
        List<TripSummaryDto> trips,
        ExtractedQuery query
    ) {
        String whenText = whenClause(query);
        if (trips.isEmpty()) {
            String hint = query.exactDate() != null && query.exactDate().equals(LocalDate.now())
                ? " Thử hỏi ngày mai hoặc xem thêm trên trang chủ nhé."
                : " Thử đổi ngày hoặc tuyến khác nhé.";
            return new AssistantChatResponse(
                "Không tìm thấy chuyến " + origin + " → " + destination + " " + whenText + "." + hint,
                List.of(
                    origin + " đi " + destination + " ngày mai",
                    origin + " đi " + destination + " tháng " + LocalDate.now().getMonthValue(),
                    "Cách đặt trước thanh toán sau?"
                ),
                List.of(),
                List.of(
                    searchAction(origin, destination, formatIsoDate(query.exactDate())),
                    navigateAction("/", "Tìm trên trang chủ")
                )
            );
        }

        String firstDate = trips.get(0).ngayDi() != null ? trips.get(0).ngayDi().toString() : formatIsoDate(query.exactDate());
        List<AssistantTripCardDto> cards = toTripCards(trips, 6);
        return new AssistantChatResponse(
            "Có " + trips.size() + " chuyến " + origin + " → " + destination + " " + whenText
                + ". Bấm chuyến bên dưới để chọn ghế và đặt vé:",
            List.of(
                origin + " → " + destination + " khứ hồi",
                "Cách đặt trước — thanh toán sau?",
                "Chuyến nào còn nhiều ghế?"
            ),
            cards,
            List.of(
                searchAction(origin, destination, firstDate),
                navigateAction("/tra-cuu-ve", "Tra cứu vé")
            )
        );
    }

    private AssistantChatResponse buildRoundTripResponse(
        String origin,
        String destination,
        List<TripSummaryDto> outbound,
        List<TripSummaryDto> inbound,
        ExtractedQuery query,
        Integer monthRet,
        Integer yearRet
    ) {
        String whenOut = whenClause(query);
        String whenRet = whenClause(monthRet, yearRet);
        StringBuilder sb = new StringBuilder();
        sb.append("Khứ hồi ").append(origin).append(" ⇄ ").append(destination).append(":\n");
        sb.append("• Chiều đi: ").append(outbound.isEmpty() ? "chưa có chuyến " + whenOut : outbound.size() + " chuyến");
        sb.append("\n• Chiều về: ").append(inbound.isEmpty() ? "chưa có chuyến " + whenRet : inbound.size() + " chuyến");
        if (!outbound.isEmpty()) {
            sb.append("\n\nChọn chuyến đi bên dưới, sau đó hỏi mình chiều về hoặc mở trang chủ chọn Khứ hồi.");
        }

        List<AssistantTripCardDto> cards = toTripCards(outbound, 5);
        cards = new ArrayList<>(cards);
        cards.addAll(toTripCards(inbound, 3).stream()
            .map(c -> new AssistantTripCardDto(
                c.id(),
                c.tenTuyen() + " (chiều về)",
                c.diemDi(),
                c.diemDen(),
                c.ngayDi(),
                c.gioDi(),
                c.gioDenDuKien(),
                c.thoiGianDuKienPhut(),
                c.giaVe(),
                c.loaiXe(),
                c.bienSo(),
                c.soGheTrong(),
                c.subtitle()
            ))
            .toList());

        String firstDate = outbound.isEmpty()
            ? (inbound.isEmpty() ? null : inbound.get(0).ngayDi().toString())
            : outbound.get(0).ngayDi().toString();

        return new AssistantChatResponse(
            sb.toString(),
            List.of(
                "Chỉ tìm chiều đi " + origin + " → " + destination,
                "Chỉ tìm chiều về " + destination + " → " + origin,
                "Cách đặt khứ hồi trên web?"
            ),
            cards,
            List.of(
                searchAction(origin, destination, firstDate),
                navigateAction("/", "Đặt khứ hồi trên trang chủ")
            )
        );
    }

    private List<AssistantTripCardDto> toTripCards(List<TripSummaryDto> trips, int limit) {
        return trips.stream().limit(limit).map(this::toTripCard).toList();
    }

    private AssistantTripCardDto toTripCard(TripSummaryDto t) {
        StringBuilder subtitle = new StringBuilder();
        subtitle.append(formatDate(t.ngayDi())).append(" · ").append(formatTime(t.gioDi()));
        subtitle.append(" · ").append(formatCurrency(t.giaVe()));
        if (t.loaiXe() != null && !t.loaiXe().isBlank()) {
            subtitle.append(" · ").append(t.loaiXe().trim());
        }
        if (t.soGheTrong() > 0) {
            subtitle.append(" · Còn ").append(t.soGheTrong()).append(" ghế");
        }
        return new AssistantTripCardDto(
            t.id(),
            t.tenTuyen(),
            t.diemDi(),
            t.diemDen(),
            t.ngayDi() != null ? t.ngayDi().toString() : null,
            t.gioDi() != null ? t.gioDi().toString() : null,
            t.gioDenDuKien() != null ? t.gioDenDuKien().toString() : null,
            t.thoiGianDuKienPhut(),
            t.giaVe(),
            t.loaiXe(),
            t.bienSo(),
            t.soGheTrong(),
            subtitle.toString()
        );
    }

    private AssistantActionDto searchAction(String diemDi, String diemDen, String ngayDi) {
        return new AssistantActionDto("SEARCH", "Xem tất cả chuyến trên trang chủ", "/", diemDi, diemDen, ngayDi);
    }

    private AssistantActionDto navigateAction(String path, String label) {
        return new AssistantActionDto("NAVIGATE", label, path, null, null, null);
    }

    private AssistantChatResponse faqWrap(String answer, List<String> suggestions, List<AssistantActionDto> actions) {
        return new AssistantChatResponse(answer, suggestions, List.of(), actions);
    }

    private Optional<AssistantChatResponse> detectFaqAnswer(String question) {
        String n = normalizeLocationForMatch(question);

        if (containsAny(n, "dat truoc", "thanh toan sau", "tra sau", "giu cho lau", "book truoc")) {
            return Optional.of(faqWrap(
                """
                Đặt trước — thanh toán sau trên VinaGo:
                1. Chọn chuyến xa (ít nhất 4 ngày trước ngày đi).
                2. Ở trang đặt vé, chọn "Đặt trước — thanh toán sau".
                3. Ghế giữ đến hạn thanh toán (3 ngày trước ngày đi).
                4. Nhắc qua email + thông báo tài khoản (7/3/1 ngày).
                5. Lịch sử vé / Tra cứu vé → "Thanh toán ngay".""",
                List.of("TP.HCM đi Cà Mau tháng 7", "Tìm chuyến xa để đặt trước"),
                List.of(navigateAction("/", "Tìm chuyến"), navigateAction("/tai-khoan/lich-su-mua-ve", "Lịch sử vé"))
            ));
        }

        if (containsAny(n, "tra cuu", "ma ve", "tim ve", "kiem tra ve")) {
            return Optional.of(faqWrap(
                """
                Tra cứu vé: nhập SĐT + mã vé tại menu Tra cứu vé.
                Xem QR, trạng thái, bản đồ theo dõi xe (nếu đã thanh toán).
                Đăng nhập → Lịch sử mua vé để xem tất cả vé.""",
                List.of("Cách hủy vé?", "Thanh toán vé đặt trước"),
                List.of(navigateAction("/tra-cuu-ve", "Mở tra cứu vé"))
            ));
        }

        if (containsAny(n, "huy ve", "yeu cau huy", "cancel ticket", "cancel")) {
            return Optional.of(faqWrap(
                """
                Hủy vé:
                • Chưa thanh toán / đặt trước: hủy trực tiếp trên Tra cứu hoặc Lịch sử vé.
                • Đã thanh toán: gửi yêu cầu hủy, nhân viên duyệt.""",
                List.of("Tra cứu vé của tôi", "Cách đặt trước?"),
                List.of(navigateAction("/tra-cuu-ve", "Tra cứu vé"))
            ));
        }

        if (containsAny(n, "payos", "thanh toan", "tra tien", "quet qr")) {
            return Optional.of(faqWrap(
                """
                Thanh toán PayOS: chọn ghế → Thanh toán ngay → quét QR / chuyển khoản.
                Vé đặt trước: thanh toán trong Lịch sử vé trước hạn.""",
                List.of("Cách đặt trước?", "TP.HCM đi Cà Mau"),
                List.of(navigateAction("/tai-khoan/lich-su-mua-ve", "Lịch sử vé"))
            ));
        }

        if (containsAny(n, "theo doi", "ban do", "vi tri xe", "xe dang o dau", "gps")) {
            return Optional.of(faqWrap(
                """
                Theo dõi xe: tab "Theo dõi xe" trên thẻ chuyến hoặc trong chi tiết vé sau thanh toán.
                Hiển thị tuyến, tiến độ %, biển số — mô phỏng theo lịch trình.""",
                List.of("TP.HCM đi Cà Mau tháng 7", "Tìm chuyến"),
                List.of(navigateAction("/", "Xem chuyến trên trang chủ"))
            ));
        }

        if (containsAny(n, "khu hoi", "ve khu hoi", "di ve", "hai chieu", "tro ve")) {
            return Optional.of(faqWrap(
                """
                Khứ hồi: Trang chủ → Khứ hồi → chọn chuyến đi & về → ghế từng chiều → thanh toán một lần.
                Hoặc hỏi mình: "TP.HCM đi Đà Lạt khứ hồi tháng 6".""",
                List.of("TP.HCM đi Cà Mau khứ hồi", "Đà Nẵng đi Huế khứ hồi"),
                List.of(navigateAction("/", "Đặt khứ hồi trên trang chủ"))
            ));
        }

        if (containsAny(n, "xin chao", "hello", "hi ", " chao ", "tro giup", "lam gi", "giup gi")) {
            return Optional.of(welcomeResponse());
        }

        return Optional.empty();
    }

    private boolean containsAny(String normalized, String... keywords) {
        for (String kw : keywords) {
            if (normalized.contains(kw)) {
                return true;
            }
        }
        return false;
    }

    private String answerGeneral(String question) {
        String prompt = buildGeneralPrompt(question);
        String responseText = callGemini(prompt, 768);
        String cleaned = responseText == null ? "" : responseText.trim();
        if (cleaned.isBlank()) {
            return """
                Mình chưa hiểu rõ câu hỏi. Bạn thử:
                • Tìm chuyến: "Sài Gòn đi Cà Mau tháng 7"
                • Hỏi: "Cách đặt trước thanh toán sau?"
                • Hỏi: "Làm sao tra cứu vé?"
                """;
        }
        return cleaned;
    }

    private String buildGeneralPrompt(String question) {
        return """
            Ban la tro ly dat ve xe khach VinaGo (website ban ve xe). Tra loi bang tieng Viet, than thien, ro rang.
            Toi da 2-6 doan ngan, co the dung gach dau dong.

            He thong ho tro:
            - Tim chuyen mot chieu / khu hoi theo diem di, diem den, thang/nam
            - Dat truoc thanh toan sau (giu ghe den 3 ngay truoc ngay di, nhan email/thong bao)
            - Thanh toan ngay qua PayOS (giu ghe 5 phut)
            - Tra cuu ve bang SDT + ma ve; lich su mua ve khi dang nhap
            - Huy ve chua thanh toan truc tiep; ve da thanh toan gui yeu cau huy
            - Theo doi xe tren ban do (mo phong theo lich trinh)

            Neu cau hoi la tim chuyen ma thieu diem di/den, nhac khach noi ro hai thanh pho.
            Neu khong chac, goi y cau mau thay vi bia thong tin.

            Cau hoi: "%s"
            """.formatted(question.replace("\"", "'").replace("\n", " "));
    }

    private List<TripSummaryDto> filterByMonth(List<TripSummaryDto> trips, Integer month, Integer year) {
        if (month == null && year == null) {
            return sortTrips(trips);
        }
        int targetYear = year != null ? year : LocalDate.now().getYear();
        int targetMonth = month != null ? month : -1;
        List<TripSummaryDto> filtered = trips.stream()
            .filter(t -> t.ngayDi() != null)
            .filter(t -> year == null || t.ngayDi().getYear() == targetYear)
            .filter(t -> targetMonth <= 0 || t.ngayDi().getMonthValue() == targetMonth)
            .toList();
        return sortTrips(filtered);
    }

    private List<TripSummaryDto> sortTrips(List<TripSummaryDto> trips) {
        return trips.stream()
            .sorted(Comparator.comparing(TripSummaryDto::ngayDi)
                .thenComparing(t -> Optional.ofNullable(t.gioDi()).orElse(null), Comparator.nullsLast(Comparator.naturalOrder())))
            .toList();
    }

    private String whenClause(Integer month, Integer year) {
        if (month != null) {
            return "trong tháng " + month + (year != null ? "/" + year : "");
        }
        if (year != null) {
            return "trong năm " + year;
        }
        return "trong thời gian sắp tới";
    }

    private String whenClause(ExtractedQuery query) {
        if (query.exactDate() != null) {
            return describeDate(query.exactDate());
        }
        return whenClause(query.month(), query.year());
    }

    private String describeDate(LocalDate date) {
        LocalDate today = LocalDate.now();
        if (date.equals(today)) {
            return "hôm nay (" + DATE_FORMATTER.format(date) + ")";
        }
        if (date.equals(today.plusDays(1))) {
            return "ngày mai (" + DATE_FORMATTER.format(date) + ")";
        }
        return "ngày " + DATE_FORMATTER.format(date);
    }

    private String formatIsoDate(LocalDate date) {
        return date != null ? date.toString() : null;
    }

    private Optional<LocalDate> parseExactDateFromQuestion(String question) {
        String n = normalizeLocationForMatch(question);
        LocalDate today = LocalDate.now();

        if (containsAny(n, "hom nay", "bua nay", "bua ni", "ngay nay", "h nay")) {
            return Optional.of(today);
        }
        if (containsAny(n, "ngay mai", " mai co", " mai k", " mai co chuyen")) {
            return Optional.of(today.plusDays(1));
        }
        if (containsAny(n, "ngay kia", "ngay mot")) {
            return Optional.of(today.plusDays(2));
        }

        Matcher matcher = Pattern.compile("(\\d{1,2})[/.\\-](\\d{1,2})(?:[/.\\-](\\d{2,4}))?").matcher(question);
        if (matcher.find()) {
            try {
                int day = Integer.parseInt(matcher.group(1));
                int month = Integer.parseInt(matcher.group(2));
                String yearRaw = matcher.group(3);
                int year = today.getYear();
                if (yearRaw != null) {
                    year = Integer.parseInt(yearRaw);
                    if (year < 100) {
                        year += 2000;
                    }
                }
                return Optional.of(LocalDate.of(year, month, day));
            } catch (Exception ignored) {
                // Fall through if the date literal is invalid.
            }
        }
        return Optional.empty();
    }

    private boolean containsExplicitYear(String question) {
        return Pattern.compile("20\\d{2}").matcher(question).find();
    }

    private ExtractedQuery applyDateOverrides(String question, ExtractedQuery parsed) {
        Optional<LocalDate> exactDate = parseExactDateFromQuestion(question);
        if (exactDate.isPresent()) {
            LocalDate date = exactDate.get();
            return new ExtractedQuery(
                parsed.origin(),
                parsed.destination(),
                date.getMonthValue(),
                date.getYear(),
                parsed.roundTrip(),
                parsed.monthReturn(),
                parsed.yearReturn(),
                date
            );
        }

        String n = normalizeLocationForMatch(question);
        LocalDate today = LocalDate.now();
        Integer month = parsed.month();
        Integer year = parsed.year();

        if (containsAny(n, "thang nay")) {
            month = today.getMonthValue();
            year = today.getYear();
        } else if (containsAny(n, "thang sau")) {
            LocalDate nextMonth = today.plusMonths(1);
            month = nextMonth.getMonthValue();
            year = nextMonth.getYear();
        } else if (containsAny(n, "tuan nay")) {
            month = today.getMonthValue();
            year = today.getYear();
        }

        if (year != null && year < today.getYear() && !containsExplicitYear(question)) {
            year = today.getYear();
        }
        if (month != null && year == null) {
            year = today.getYear();
        }

        return new ExtractedQuery(
            parsed.origin(),
            parsed.destination(),
            month,
            year,
            parsed.roundTrip(),
            parsed.monthReturn(),
            parsed.yearReturn(),
            null
        );
    }

    private void appendTripLines(StringBuilder sb, List<TripSummaryDto> trips, int maxLines) {
        int count = Math.min(maxLines, trips.size());
        for (int i = 0; i < count; i++) {
            TripSummaryDto t = trips.get(i);
            sb.append("\n- ")
                .append(formatDate(t.ngayDi()))
                .append(" ")
                .append(formatTime(t.gioDi()))
                .append(" | ")
                .append(formatCurrency(t.giaVe()));
            if (t.loaiXe() != null && !t.loaiXe().isBlank()) {
                sb.append(" | ").append(t.loaiXe().trim());
            }
            if (t.soGheTrong() > 0) {
                sb.append(" | Còn ").append(t.soGheTrong()).append(" ghế");
            }
        }
        if (trips.size() > maxLines) {
            sb.append("\n- … và ").append(trips.size() - maxLines).append(" chuyến khác (xem thêm trên trang đặt vé).");
        }
    }

    private String buildAnswer(
        String origin,
        String destination,
        List<TripSummaryDto> trips,
        Integer month,
        Integer year,
        boolean roundTripHint
    ) {
        if (trips.isEmpty()) {
            String whenText = whenClause(month, year);
            String suffix = roundTripHint
                ? " Bạn có thể hỏi thêm chiều về (" + destination + " → " + origin + ") nếu cần khứ hồi."
                : "";
            return "Không tìm thấy chuyến phù hợp cho " + origin + " → " + destination + " " + whenText
                + ". Bạn thử đổi ngày hoặc tuyến khác nhé." + suffix;
        }
        String whenText = whenClause(month, year);
        StringBuilder sb = new StringBuilder();
        sb.append("Có ").append(trips.size()).append(" chuyến ").append(origin).append(" → ")
            .append(destination).append(" ").append(whenText).append(":");
        appendTripLines(sb, trips, 5);
        sb.append("\n\n→ Vào Trang chủ, chọn tuyến và ngày tương ứng để đặt vé hoặc đặt trước.");
        return sb.toString();
    }

    private String buildRoundTripAnswer(
        String origin,
        String destination,
        List<TripSummaryDto> outbound,
        List<TripSummaryDto> inbound,
        Integer monthOut,
        Integer yearOut,
        Integer monthRet,
        Integer yearRet
    ) {
        String whenOut = whenClause(monthOut, yearOut);
        String whenRet = whenClause(monthRet, yearRet);
        boolean sameWhen = java.util.Objects.equals(monthOut, monthRet) && java.util.Objects.equals(yearOut, yearRet);

        StringBuilder sb = new StringBuilder();
        sb.append("Khứ hồi ").append(origin).append(" ⇄ ").append(destination);
        if (sameWhen && monthOut != null) {
            sb.append(" (").append(whenOut).append("):");
        } else {
            sb.append(" — Chiều đi ").append(whenOut).append(", chiều về ").append(whenRet).append(":");
        }

        if (outbound.isEmpty()) {
            sb.append("\n\nChiều đi: không có chuyến ").append(origin).append(" → ").append(destination).append(" ")
                .append(whenOut).append(".");
        } else {
            sb.append("\n\nChiều đi (").append(outbound.size()).append(" chuyến):");
            appendTripLines(sb, outbound, 4);
        }

        if (inbound.isEmpty()) {
            sb.append("\n\nChiều về: không có chuyến ").append(destination).append(" → ").append(origin).append(" ")
                .append(whenRet).append(".");
        } else {
            sb.append("\n\nChiều về (").append(inbound.size()).append(" chuyến):");
            appendTripLines(sb, inbound, 4);
        }

        if (!outbound.isEmpty() && !inbound.isEmpty()) {
            sb.append("\n\nTrên web bạn chọn “Khứ hồi”, chọn chuyến và ghế từng chiều rồi thanh toán một lần.");
        } else if (outbound.isEmpty() && inbound.isEmpty()) {
            sb.append("\n\nBạn thử đổi tháng hoặc đổi cặp điểm — hệ thống lưu tuyến chiều về riêng cho nhiều cặp thành phố.");
        }
        return sb.toString();
    }

    private String resolveLocation(String keyword, boolean isOrigin) {
        String trimmed = keyword.trim();
        String canonicalKeyword = canonicalizeLocation(trimmed);
        List<String> suggestions = isOrigin
            ? bookingCatalogService.suggestOrigins(canonicalKeyword)
            : bookingCatalogService.suggestDestinations(canonicalKeyword);
        if (suggestions.isEmpty()) {
            return canonicalKeyword;
        }
        String normalizedInput = normalizeLocationForMatch(canonicalKeyword);
        return suggestions.stream()
            .filter(item -> {
                String normalizedItem = normalizeLocationForMatch(item);
                return normalizedItem.contains(normalizedInput) || normalizedInput.contains(normalizedItem);
            })
            .findFirst()
            .orElse(suggestions.get(0));
    }

    private String canonicalizeLocation(String raw) {
        String normalized = normalizeLocationForMatch(raw);
        return LOCATION_ALIASES.getOrDefault(normalized, raw);
    }

    private String normalizeLocationForMatch(String value) {
        if (value == null) {
            return "";
        }
        String lower = value.trim().toLowerCase(Locale.ROOT);
        String noAccent = Normalizer.normalize(lower, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        return noAccent
            .replace('.', ' ')
            .replace('-', ' ')
            .replaceAll("\\s+", " ")
            .trim();
    }

    private ExtractedQuery extractQuery(String question) {
        String prompt = buildPrompt(question);
        String responseText = callGemini(prompt, 384);
        String jsonText = extractJson(responseText);
        ExtractedQuery parsed;
        try {
            JsonNode node = objectMapper.readTree(jsonText);
            String origin = asText(node, "origin");
            String destination = asText(node, "destination");
            Integer month = asInt(node, "month");
            Integer year = asInt(node, "year");
            boolean roundTrip = asBoolean(node, "roundTrip");
            Integer monthReturn = asInt(node, "monthReturn");
            Integer yearReturn = asInt(node, "yearReturn");
            parsed = new ExtractedQuery(origin, destination, month, year, roundTrip, monthReturn, yearReturn, null);
        } catch (Exception e) {
            parsed = new ExtractedQuery(null, null, null, null, false, null, null, null);
        }

        parsed = mergeWithRuleBasedRoute(question, parsed);
        return applyDateOverrides(question, parsed);
    }

    private ExtractedQuery mergeWithRuleBasedRoute(String question, ExtractedQuery parsed) {
        Optional<String[]> ruleRoute = extractRouteFromQuestion(question);
        if (ruleRoute.isEmpty()) {
            return parsed;
        }
        String origin = parsed.origin();
        String destination = parsed.destination();
        if (origin == null || origin.isBlank()) {
            origin = ruleRoute.get()[0];
        }
        if (destination == null || destination.isBlank()) {
            destination = ruleRoute.get()[1];
        }
        return new ExtractedQuery(
            origin,
            destination,
            parsed.month(),
            parsed.year(),
            parsed.roundTrip(),
            parsed.monthReturn(),
            parsed.yearReturn(),
            parsed.exactDate()
        );
    }

    private Optional<String[]> extractRouteFromQuestion(String question) {
        String n = normalizeLocationForMatch(question);

        Matcher routeMatcher = Pattern.compile(
            "(?:tu|from)\\s+(.+?)\\s+(?:ve|den|di|to)\\s+(.+?)(?:\\?|$|\\sco\\s|\\sth\\s|\\sthang\\s|\\shom\\s|\\sbua\\s|\\sngay\\s|\\skhong|\\sk\\s*$)"
        ).matcher(n);
        if (routeMatcher.find()) {
            return Optional.of(new String[] {
                canonicalizeLocation(cleanLocationToken(routeMatcher.group(1))),
                canonicalizeLocation(cleanLocationToken(routeMatcher.group(2))),
            });
        }

        Matcher simpleMatcher = Pattern.compile(
            "^(.+?)\\s+(?:ve|den|di)\\s+(.+?)(?:\\?|$|\\sco\\s|\\sth\\s|\\sthang\\s|\\shom\\s|\\sbua\\s|\\sngay\\s|\\skhong|\\sk\\s*$)"
        ).matcher(n);
        if (simpleMatcher.find()) {
            return Optional.of(new String[] {
                canonicalizeLocation(cleanLocationToken(simpleMatcher.group(1))),
                canonicalizeLocation(cleanLocationToken(simpleMatcher.group(2))),
            });
        }

        List<String> ordered = new ArrayList<>();
        record AliasHit(int index, String canonical) {}
        List<AliasHit> hits = new ArrayList<>();
        for (Map.Entry<String, String> entry : LOCATION_ALIASES.entrySet()) {
            int idx = n.indexOf(entry.getKey());
            if (idx >= 0) {
                hits.add(new AliasHit(idx, entry.getValue()));
            }
        }
        hits.sort(Comparator.comparingInt(AliasHit::index));
        for (AliasHit hit : hits) {
            if (!ordered.contains(hit.canonical())) {
                ordered.add(hit.canonical());
            }
        }
        if (ordered.size() >= 2) {
            return Optional.of(new String[] { ordered.get(0), ordered.get(1) });
        }
        return Optional.empty();
    }

    private String cleanLocationToken(String raw) {
        if (raw == null) {
            return "";
        }
        return raw
            .replaceAll("\\s+(k|khong|ko|hn|hcm|co chuyen nao|co chuyen|co xe|co bus)$", "")
            .replaceAll("^(bua nay|hom nay|ngay nay|ngay mai|co chuyen nao|co chuyen|co xe|tim|tim kiem)\\s+", "")
            .trim();
    }

    private String buildPrompt(String question) {
        LocalDate today = LocalDate.now();
        return """
            Ban la bo trich xuat thong tin dat ve xe khach tu cau hoi tieng Viet.
            Tra ve DUY NHAT mot object JSON (khong markdown, khong giai thich), dung schema:
            {"origin":string|null,"destination":string|null,"month":number|null,"year":number|null,\
            "roundTrip":boolean,"monthReturn":number|null,"yearReturn":number|null}

            Hom nay la %s (thang %d nam %d). LUON uu tien nam hien tai (%d) neu khach khong noi nam cu the.

            Quy tac:
            - origin = noi xuat phat / diem don; destination = noi den / diem tra.
            - "hom nay", "bua nay", "ngay nay" -> month=%d, year=%d.
            - "ngay mai" -> thang/nam tuong ung ngay mai.
            - "thang nay" -> month=%d, year=%d.
            - month/year: thoi gian chuyen DI. KHONG dung nam 2024 hay nam cu neu khach hoi ve hom nay/thang nay.
            - roundTrip = true neu khach hoi khu hoi, ve khu hoi, hai chieu, di va ve, co chieu ve, book ca di lan ve, \
            "tu A den B roi ve lai A", tro ve, ngay ve (kem chuyen di).
            - monthReturn/yearReturn: thang/nam rieng cho chuyen VE neu khach noi ro (vd "di thang 6 ve thang 7"); \
            neu khong noi rieng thi de null (he thong se dung cung thang/nam voi chuyen di neu co).
            - Neu cau khong lien quan tim chuyen, van tra JSON voi origin/destination null.

            Cau hoi: "%s"
            """.formatted(
            DATE_FORMATTER.format(today),
            today.getMonthValue(),
            today.getYear(),
            today.getYear(),
            today.getMonthValue(),
            today.getYear(),
            today.getMonthValue(),
            today.getYear(),
            question.replace("\"", "'").replace("\n", " ")
        );
    }

    private String callGemini(String prompt, int maxOutputTokens) {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
        ObjectNode root = objectMapper.createObjectNode();
        ArrayNode contents = root.putArray("contents");
        ObjectNode user = contents.addObject();
        user.put("role", "user");
        ArrayNode parts = user.putArray("parts");
        parts.addObject().put("text", prompt);
        ObjectNode config = root.putObject("generationConfig");
        config.put("temperature", 0.2);
        config.put("maxOutputTokens", Math.max(256, maxOutputTokens));

        try {
            String body = objectMapper.writeValueAsString(root);
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json; charset=utf-8")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 400) {
                throw mapGeminiError(response.statusCode(), response.body());
            }
            JsonNode node = objectMapper.readTree(response.body());
            return node.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText("");
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Khong the ket noi Gemini");
        }
    }

    private ResponseStatusException mapGeminiError(int statusCode, String body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            String message = root.path("error").path("message").asText("");
            if (statusCode == 429) {
                return new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Gemini het quota/credit. Kiem tra billing va quota tren Google AI Studio.");
            }
            if (statusCode == 401 || statusCode == 403) {
                return new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Gemini API key khong hop le hoac khong co quyen.");
            }
            if (statusCode == 404) {
                return new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Model Gemini khong ton tai hoac khong ho tro generateContent.");
            }
            if (message != null && !message.isBlank()) {
                return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gemini loi: " + message);
            }
        } catch (Exception ignored) {
            // Fall through to generic message when response body isn't parseable JSON.
        }
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gemini khong phan hoi hop le");
    }

    private String extractJson(String text) {
        if (text == null) {
            return "{}";
        }
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1);
        }
        return text.trim();
    }

    private String asText(JsonNode node, String field) {
        if (node == null || node.get(field) == null || node.get(field).isNull()) {
            return null;
        }
        String value = node.get(field).asText();
        return value != null && !value.isBlank() ? value.trim() : null;
    }

    private boolean asBoolean(JsonNode node, String field) {
        if (node == null || node.get(field) == null || node.get(field).isNull()) {
            return false;
        }
        JsonNode value = node.get(field);
        if (value.isBoolean()) {
            return value.asBoolean();
        }
        if (value.isTextual()) {
            String t = value.asText().trim().toLowerCase(Locale.ROOT);
            return "true".equals(t) || "1".equals(t) || "yes".equals(t) || "co".equals(t);
        }
        if (value.isNumber()) {
            return value.asInt() != 0;
        }
        return false;
    }

    private Integer asInt(JsonNode node, String field) {
        if (node == null || node.get(field) == null || node.get(field).isNull()) {
            return null;
        }
        JsonNode value = node.get(field);
        if (value.isInt()) {
            return value.asInt();
        }
        if (value.isNumber()) {
            return value.numberValue().intValue();
        }
        if (value.isTextual()) {
            try {
                return Integer.parseInt(value.asText().trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private String formatDate(LocalDate date) {
        return date == null ? "" : DATE_FORMATTER.format(date);
    }

    private String formatTime(java.time.LocalTime time) {
        return time == null ? "--:--" : time.toString().substring(0, 5);
    }

    private String formatCurrency(BigDecimal value) {
        NumberFormat formatter = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));
        formatter.setMaximumFractionDigits(0);
        return formatter.format(value != null ? value : BigDecimal.ZERO);
    }

    private record ExtractedQuery(
        String origin,
        String destination,
        Integer month,
        Integer year,
        boolean roundTrip,
        Integer monthReturn,
        Integer yearReturn,
        LocalDate exactDate
    ) {
    }
}
