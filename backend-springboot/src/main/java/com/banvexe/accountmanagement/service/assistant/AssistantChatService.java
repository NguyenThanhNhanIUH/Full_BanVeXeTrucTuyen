package com.banvexe.accountmanagement.service.assistant;

import com.banvexe.accountmanagement.dto.assistant.AssistantChatResponse;
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
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Optional;
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
        Map.entry("dn", "Đà Nẵng")
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
        ExtractedQuery query = extractQuery(question);
        if (query.origin() == null || query.origin().isBlank() || query.destination() == null || query.destination().isBlank()) {
            return new AssistantChatResponse(
                "Bạn cho mình biết điểm đi và điểm đến nhé. Có thể hỏi một chiều hoặc khứ hồi, kèm tháng/năm nếu cần lọc.");
        }

        String origin = resolveLocation(query.origin(), true);
        String destination = resolveLocation(query.destination(), false);

        List<TripSummaryDto> outbound = bookingCatalogService.searchTrips(origin, destination, null, 1);
        List<TripSummaryDto> outboundFiltered = filterByMonth(outbound, query.month(), query.year());

        if (!query.roundTrip()) {
            String answer = buildAnswer(origin, destination, outboundFiltered, query.month(), query.year(), false);
            return new AssistantChatResponse(answer);
        }

        Integer retMonth = query.monthReturn() != null ? query.monthReturn() : query.month();
        Integer retYear = query.yearReturn() != null ? query.yearReturn() : query.year();

        List<TripSummaryDto> inbound = bookingCatalogService.searchTrips(destination, origin, null, 1);
        List<TripSummaryDto> inboundFiltered = filterByMonth(inbound, retMonth, retYear);

        String answer = buildRoundTripAnswer(
            origin,
            destination,
            outboundFiltered,
            inboundFiltered,
            query.month(),
            query.year(),
            retMonth,
            retYear
        );
        return new AssistantChatResponse(answer);
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
        String responseText = callGemini(prompt);
        String jsonText = extractJson(responseText);
        try {
            JsonNode node = objectMapper.readTree(jsonText);
            String origin = asText(node, "origin");
            String destination = asText(node, "destination");
            Integer month = asInt(node, "month");
            Integer year = asInt(node, "year");
            boolean roundTrip = asBoolean(node, "roundTrip");
            Integer monthReturn = asInt(node, "monthReturn");
            Integer yearReturn = asInt(node, "yearReturn");
            return new ExtractedQuery(origin, destination, month, year, roundTrip, monthReturn, yearReturn);
        } catch (Exception e) {
            return new ExtractedQuery(null, null, null, null, false, null, null);
        }
    }

    private String buildPrompt(String question) {
        return """
            Ban la bo trich xuat thong tin dat ve xe khach tu cau hoi tieng Viet.
            Tra ve DUY NHAT mot object JSON (khong markdown, khong giai thich), dung schema:
            {"origin":string|null,"destination":string|null,"month":number|null,"year":number|null,\
            "roundTrip":boolean,"monthReturn":number|null,"yearReturn":number|null}

            Quy tac:
            - origin = noi xuat phat / diem don; destination = noi den / diem tra.
            - month/year: thoi gian chuyen DI (uu tien). Neu khach noi "thang sau", "thang 6 toi" hay suy ra theo ngay hom nay.
            - roundTrip = true neu khach hoi khu hoi, ve khu hoi, hai chieu, di va ve, co chieu ve, book ca di lan ve, \
            "tu A den B roi ve lai A", tro ve, ngay ve (kem chuyen di).
            - monthReturn/yearReturn: thang/nam rieng cho chuyen VE neu khach noi ro (vd "di thang 6 ve thang 7"); \
            neu khong noi rieng thi de null (he thong se dung cung thang/nam voi chuyen di neu co).
            - Neu cau khong lien quan tim chuyen, van tra JSON voi origin/destination null.

            Cau hoi: "%s"
            """.formatted(question.replace("\"", "'").replace("\n", " "));
    }

    private String callGemini(String prompt) {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
        ObjectNode root = objectMapper.createObjectNode();
        ArrayNode contents = root.putArray("contents");
        ObjectNode user = contents.addObject();
        user.put("role", "user");
        ArrayNode parts = user.putArray("parts");
        parts.addObject().put("text", prompt);
        ObjectNode config = root.putObject("generationConfig");
        config.put("temperature", 0.2);
        config.put("maxOutputTokens", 384);

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
        Integer yearReturn
    ) {
    }
}
