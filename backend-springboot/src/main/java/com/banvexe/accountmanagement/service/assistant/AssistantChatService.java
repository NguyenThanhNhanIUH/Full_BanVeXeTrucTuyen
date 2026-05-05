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
            return new AssistantChatResponse("Bạn cho mình biết điểm đi và điểm đến nhé (vd: từ TP. Hồ Chí Minh đến Nha Trang).");
        }

        String origin = resolveLocation(query.origin(), true);
        String destination = resolveLocation(query.destination(), false);

        List<TripSummaryDto> trips = bookingCatalogService.searchTrips(origin, destination, null, 1);
        List<TripSummaryDto> filtered = filterByMonth(trips, query.month(), query.year());

        String answer = buildAnswer(origin, destination, filtered, query.month(), query.year());
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

    private String buildAnswer(String origin, String destination, List<TripSummaryDto> trips, Integer month, Integer year) {
        if (trips.isEmpty()) {
            String whenText = month != null
                ? "trong tháng " + month + (year != null ? "/" + year : "")
                : "trong thời gian sắp tới";
            return "Không tìm thấy chuyến phù hợp cho " + origin + " → " + destination + " " + whenText + ". Bạn thử đổi ngày hoặc tuyến khác nhé.";
        }
        String whenText = month != null
            ? "trong tháng " + month + (year != null ? "/" + year : "")
            : "trong thời gian sắp tới";
        StringBuilder sb = new StringBuilder();
        sb.append("Có ").append(trips.size()).append(" chuyến ").append(origin).append(" → ")
            .append(destination).append(" ").append(whenText).append(":");
        int count = Math.min(5, trips.size());
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
            return new ExtractedQuery(origin, destination, month, year);
        } catch (Exception e) {
            return new ExtractedQuery(null, null, null, null);
        }
    }

    private String buildPrompt(String question) {
        return "Trich xuat diem di va diem den tu cau hoi ve tim chuyen xe. "
            + "Tra ve JSON duy nhat theo mau: {\"origin\":string|null,\"destination\":string|null,\"month\":number|null,\"year\":number|null}. "
            + "Khong giai thich. Cau hoi: \"" + question.replace("\"", "'") + "\"";
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
        config.put("maxOutputTokens", 256);

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

    private record ExtractedQuery(String origin, String destination, Integer month, Integer year) {
    }
}
