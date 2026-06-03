package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.dto.booking.PayOsConfirmResponse;
import com.banvexe.accountmanagement.dto.booking.PayOsLinkResponse;
import com.banvexe.accountmanagement.entity.KhachHang;
import com.banvexe.accountmanagement.entity.PaymentMethod;
import com.banvexe.accountmanagement.entity.PaymentTxnStatus;
import com.banvexe.accountmanagement.entity.ThanhToan;
import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.entity.VeXe;
import com.banvexe.accountmanagement.repository.KhachHangRepository;
import com.banvexe.accountmanagement.repository.ThanhToanRepository;
import com.banvexe.accountmanagement.repository.VeXeRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import java.util.stream.Collectors;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PayOsService {

    private static final String PENDING_PREFIX = "PAYOS-PENDING-";
    private static final String FAILED_PREFIX = "PAYOS-FAILED-";
    private static final Pattern PAYOS_FAIL_NOTE = Pattern.compile("\\s*\\|\\s*PayOS thất bại\\s*\\([^)]*\\)");

    private final VeXeRepository veXeRepository;
    private final ThanhToanRepository thanhToanRepository;
    private final KhachHangRepository khachHangRepository;
    private final BookingNotificationService bookingNotificationService;
    private final BookingHoldPolicy bookingHoldPolicy;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${app.payos.dev-mock:false}")
    private boolean devMock;

    @Value("${app.payos.client-id:}")
    private String clientId;

    @Value("${app.payos.api-key:}")
    private String apiKey;

    @Value("${app.payos.checksum-key:}")
    private String checksumKey;

    @Value("${app.payos.base-url:https://api-merchant.payos.vn}")
    private String baseUrl;

    @Value("${app.payos.return-url:http://localhost:5173/thanh-toan/ket-qua}")
    private String returnUrl;

    @Value("${app.payos.cancel-url:http://localhost:5173/thanh-toan}")
    private String cancelUrl;

    public PayOsService(
        VeXeRepository veXeRepository,
        ThanhToanRepository thanhToanRepository,
        KhachHangRepository khachHangRepository,
        BookingNotificationService bookingNotificationService,
        BookingHoldPolicy bookingHoldPolicy,
        ObjectMapper objectMapper
    ) {
        this.veXeRepository = veXeRepository;
        this.thanhToanRepository = thanhToanRepository;
        this.khachHangRepository = khachHangRepository;
        this.bookingNotificationService = bookingNotificationService;
        this.bookingHoldPolicy = bookingHoldPolicy;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PayOsLinkResponse createLink(KhachHang khach, List<Integer> ticketIds, String fullName) {
        ensureConfigured();
        if (ticketIds == null || ticketIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Danh sách vé thanh toán trống");
        }

        List<VeXe> tickets = ticketIds.stream()
            .distinct()
            .map(id -> veXeRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé #" + id)))
            .toList();

        for (VeXe ve : tickets) {
            if (!ve.getKhachHangId().equals(khach.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Có vé không thuộc tài khoản khách hàng");
            }
            if (ve.getTrangThai() != TicketStatus.CHO_THANH_TOAN) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ hỗ trợ thanh toán vé chờ thanh toán");
            }
            bookingHoldPolicy.assertHoldActive(ve);
        }

        long orderCode = Instant.now().toEpochMilli();
        if (devMock) {
            String pendingKey = pendingKey(orderCode);
            for (VeXe ve : tickets) {
                ThanhToan tt = new ThanhToan();
                tt.setVeXe(ve);
                tt.setSoTien(ve.getTongTien());
                tt.setPhuongThuc(PaymentMethod.CHUYEN_KHOAN);
                tt.setMaGiaoDich(pendingKey);
                tt.setTrangThai(PaymentTxnStatus.DANG_XU_LY);
                tt.setNgayThanhToan(Instant.now());
                thanhToanRepository.save(tt);
            }
            String sep = returnUrl.contains("?") ? "&" : "?";
            String checkoutUrl = returnUrl + sep + "orderCode=" + orderCode + "&payosDevMock=1";
            return new PayOsLinkResponse(orderCode, checkoutUrl, "");
        }

        long amount = tickets.stream()
            .map(VeXe::getTongTien)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .longValue();
        String description = buildDescription(tickets);
        String effectiveCancelUrl = buildCancelUrl();

        Map<String, Object> body = new HashMap<>();
        body.put("orderCode", orderCode);
        body.put("amount", amount);
        body.put("description", description);
        body.put("returnUrl", returnUrl);
        body.put("cancelUrl", effectiveCancelUrl);
        body.put("buyerName", fullName);
        body.put("buyerEmail", khach.getEmail());
        body.put("buyerPhone", khach.getPhone());
        body.put("signature", signCreate(orderCode, amount, description, effectiveCancelUrl));

        JsonNode response = postJson(baseUrl + "/v2/payment-requests", body);
        JsonNode data = response.path("data");
        if (data.isMissingNode() || data.path("checkoutUrl").asText("").isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Không tạo được liên kết thanh toán PayOS");
        }

        String pendingKey = pendingKey(orderCode);
        for (VeXe ve : tickets) {
            ThanhToan tt = new ThanhToan();
            tt.setVeXe(ve);
            tt.setSoTien(ve.getTongTien());
            tt.setPhuongThuc(PaymentMethod.CHUYEN_KHOAN);
            tt.setMaGiaoDich(pendingKey);
            tt.setTrangThai(PaymentTxnStatus.DANG_XU_LY);
            tt.setNgayThanhToan(Instant.now());
            thanhToanRepository.save(tt);
        }

        String qrValue = firstNonBlank(
            data.path("qrCodeUrl").asText(""),
            data.path("qrCode").asText(""),
            data.path("vietQR").asText("")
        );
        return new PayOsLinkResponse(orderCode, data.path("checkoutUrl").asText(), qrValue);
    }

    @Transactional
    public PayOsConfirmResponse confirmOrder(Long orderCode) {
        if (orderCode == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu orderCode");
        }

        if (devMock) {
            finalizeOrder(orderCode, true, "DEV_MOCK_PAID");
            return new PayOsConfirmResponse(orderCode, "DEV_MOCK_PAID", true);
        }

        ensureConfigured();

        JsonNode node = getJson(baseUrl + "/v2/payment-requests/" + orderCode);
        JsonNode data = node.path("data");
        String status = data.path("status").asText("");
        boolean paid = isPaidStatus(status);
        if (!paid && !data.isMissingNode()) {
            long amountRemaining = data.path("amountRemaining").asLong(-1);
            long amountPaid = data.path("amountPaid").asLong(-1);
            if (amountRemaining == 0 && amountPaid > 0) {
                paid = true;
            }
        }
        finalizeOrder(orderCode, paid, status);
        return new PayOsConfirmResponse(orderCode, status, paid);
    }

    /**
     * Giao dịch PayOS vẫn đang mở — không được coi là thất bại (tránh đổi maGiaoDich sang PAYOS-FAILED
     * khi poll sớm lúc status còn PENDING, làm mất khóa PAYOS-PENDING và không bao giờ khớp khi PAID).
     */
    private boolean isPayOsStillInProgress(String status) {
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        return normalized.isEmpty()
            || normalized.equals("PENDING")
            || normalized.equals("PROCESSING");
    }

    private List<ThanhToan> loadTxnsForFinalize(Long orderCode) {
        List<ThanhToan> txns = thanhToanRepository.findByMaGiaoDichForUpdate(pendingKey(orderCode));
        if (txns.isEmpty()) {
            txns = thanhToanRepository.findByMaGiaoDichForUpdate(FAILED_PREFIX + orderCode);
        }
        return txns;
    }

    @Transactional
    public void finalizeFromWebhook(Long orderCode, String status) {
        if (orderCode == null) return;
        boolean paid = isPaidStatus(status);
        finalizeOrder(orderCode, paid, status == null ? "" : status);
    }

    @Transactional
    public void handleWebhook(Map<String, Object> payload) {
        ParsedWebhook parsed = parseAndVerifyWebhook(payload);
        finalizeFromWebhook(parsed.orderCode(), parsed.status());
    }

    private void finalizeOrder(Long orderCode, boolean paid, String status) {
        if (!paid && isPayOsStillInProgress(status)) {
            return;
        }

        List<ThanhToan> txns = loadTxnsForFinalize(orderCode);
        if (txns.isEmpty()) return;

        boolean alreadyFinalSuccess = txns.stream().anyMatch(tt -> tt.getTrangThai() == PaymentTxnStatus.THANH_CONG);
        if (!paid && alreadyFinalSuccess) {
            return;
        }

        boolean hasTransitionToPaid = false;
        for (ThanhToan tt : txns) {
            VeXe ve = tt.getVeXe();
            boolean holdExpired = paid && ve != null && bookingHoldPolicy.isHoldExpired(ve);
            PaymentTxnStatus nextStatus = !paid || holdExpired
                ? PaymentTxnStatus.THAT_BAI
                : PaymentTxnStatus.THANH_CONG;
            if (tt.getTrangThai() != nextStatus) {
                if (nextStatus == PaymentTxnStatus.THANH_CONG) {
                    hasTransitionToPaid = true;
                }
                tt.setTrangThai(nextStatus);
                tt.setNgayThanhToan(Instant.now());
                tt.setMaGiaoDich((paid && !holdExpired ? "PAYOS-" : FAILED_PREFIX) + orderCode);
                thanhToanRepository.save(tt);
            }

            if (ve != null) {
                if (paid && !holdExpired) {
                    ve.setTrangThai(TicketStatus.DA_THANH_TOAN);
                    stripErroneousPayOsFailNote(ve);
                } else if (paid && holdExpired) {
                    ve.setTrangThai(TicketStatus.DA_HUY);
                    ve.setGhiChu(com.banvexe.accountmanagement.util.TicketGhiChuUtil.ghiChuHuyThanhCong(
                        "quá thời gian giữ chỗ " + bookingHoldPolicy.holdMinutes() + " phút"
                    ));
                } else if (ve.getTrangThai() != TicketStatus.DA_THANH_TOAN) {
                    ve.setTrangThai(TicketStatus.CHO_THANH_TOAN);
                }
                if (!paid
                    && ve.getTrangThai() != TicketStatus.DA_THANH_TOAN
                    && (ve.getGhiChu() == null || !ve.getGhiChu().contains("PayOS thất bại"))) {
                    ve.setGhiChu((ve.getGhiChu() == null ? "" : ve.getGhiChu() + " | ") + "PayOS thất bại (" + status + ")");
                }
                veXeRepository.save(ve);
            }
        }
        if (paid && hasTransitionToPaid) {
            notifyPaymentSuccessForOrder(txns, orderCode);
        }
    }

    private void stripErroneousPayOsFailNote(VeXe ve) {
        String note = ve.getGhiChu();
        if (note == null || !note.contains("PayOS thất bại")) {
            return;
        }
        String cleaned = PAYOS_FAIL_NOTE.matcher(note).replaceAll("").trim();
        ve.setGhiChu(cleaned.isEmpty() ? null : cleaned);
    }

    private void notifyPaymentSuccessForOrder(List<ThanhToan> txns, Long orderCode) {
        List<VeXe> tickets = txns.stream()
            .map(ThanhToan::getVeXe)
            .filter(v -> v != null)
            .toList();
        if (tickets.isEmpty()) return;
        Integer khachId = tickets.get(0).getKhachHangId();
        if (khachId == null) return;
        khachHangRepository.findById(khachId).ifPresent(khach ->
            bookingNotificationService.sendPaymentSuccess(khach, tickets, "PAYOS-" + orderCode)
        );
    }

    private boolean isPaidStatus(String status) {
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        return normalized.equals("PAID") || normalized.equals("SUCCEEDED") || normalized.equals("SUCCESS");
    }

    private String buildDescription(List<VeXe> tickets) {
        String joined = tickets.stream()
            .map(VeXe::getMaVe)
            .filter(v -> v != null && !v.isBlank())
            .sorted(Comparator.naturalOrder())
            .collect(Collectors.joining(","));
        String compact = "TT VE " + (joined.isBlank() ? tickets.size() + "_VE" : joined);
        return compact.length() > 25 ? compact.substring(0, 25) : compact;
    }

    private String signCreate(long orderCode, long amount, String description, String effectiveCancelUrl) {
        String dataToSign = "amount=" + amount
            + "&cancelUrl=" + effectiveCancelUrl
            + "&description=" + description
            + "&orderCode=" + orderCode
            + "&returnUrl=" + returnUrl;
        return hmacSha256(dataToSign, checksumKey);
    }

    private String buildCancelUrl() {
        if (cancelUrl == null || cancelUrl.isBlank()) {
            return "http://localhost:5173/thanh-toan?payos=cancel";
        }
        if (cancelUrl.contains("payos=cancel")) {
            return cancelUrl;
        }
        return cancelUrl + (cancelUrl.contains("?") ? "&" : "?") + "payos=cancel";
    }

    private String hmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể ký PayOS");
        }
    }

    private JsonNode postJson(String url, Map<String, Object> body) {
        try {
            String payload = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("x-client-id", clientId)
                .header("x-api-key", apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "PayOS tạo link thất bại: " + response.body());
            }
            return objectMapper.readTree(response.body());
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Không gọi được PayOS create-link");
        }
    }

    private JsonNode getJson(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("x-client-id", clientId)
                .header("x-api-key", apiKey)
                .GET()
                .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "PayOS kiểm tra trạng thái thất bại");
            }
            return objectMapper.readTree(response.body());
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Không gọi được PayOS status");
        }
    }

    private String pendingKey(Long orderCode) {
        return PENDING_PREFIX + orderCode;
    }

    private String firstNonBlank(String... values) {
        if (values == null) return "";
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    @SuppressWarnings("unchecked")
    private ParsedWebhook parseAndVerifyWebhook(Map<String, Object> payload) {
        if (payload == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Webhook payload rỗng");
        }
        Object dataObj = payload.get("data");
        if (!(dataObj instanceof Map<?, ?> rawData)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Webhook thiếu trường data");
        }
        Map<String, Object> data = (Map<String, Object>) rawData;
        String signature = extractSignature(payload, data);
        if (signature.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Webhook thiếu signature");
        }
        String signData = buildWebhookSignData(data);
        String expectedSignature = hmacSha256(signData, checksumKey);
        if (!signature.equalsIgnoreCase(expectedSignature)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Webhook signature không hợp lệ");
        }
        return new ParsedWebhook(extractOrderCode(data), extractStatus(data));
    }

    private String extractSignature(Map<String, Object> payload, Map<String, Object> data) {
        Object top = payload.get("signature");
        if (top instanceof String str && !str.isBlank()) {
            return str.trim();
        }
        Object nested = data.get("signature");
        if (nested instanceof String str && !str.isBlank()) {
            return str.trim();
        }
        return "";
    }

    private String buildWebhookSignData(Map<String, Object> data) {
        return data.entrySet().stream()
            .filter(entry -> {
                String key = entry.getKey();
                return !"signature".equalsIgnoreCase(key) && !"sign".equalsIgnoreCase(key);
            })
            .sorted(Map.Entry.comparingByKey())
            .flatMap(entry -> Stream.of(entry.getKey() + "=" + stringifyWebhookValue(entry.getValue())))
            .collect(Collectors.joining("&"));
    }

    private String stringifyWebhookValue(Object value) {
        if (value == null) return "";
        if (value instanceof String || value instanceof Number || value instanceof Boolean) {
            return String.valueOf(value);
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return String.valueOf(value);
        }
    }

    private Long extractOrderCode(Map<String, Object> data) {
        Object rawOrderCode = data.get("orderCode");
        if (rawOrderCode instanceof Number number) {
            return number.longValue();
        }
        if (rawOrderCode instanceof String str && !str.isBlank()) {
            try {
                return Long.parseLong(str.trim());
            } catch (NumberFormatException ex) {
                return null;
            }
        }
        return null;
    }

    private String extractStatus(Map<String, Object> data) {
        Object rawStatus = data.get("status");
        return rawStatus instanceof String str ? str : "";
    }

    private void ensureConfigured() {
        if (devMock) {
            return;
        }
        StringBuilder missing = new StringBuilder();
        if (clientId == null || clientId.isBlank()) {
            missing.append("PAYOS_CLIENT_ID");
        }
        if (apiKey == null || apiKey.isBlank()) {
            if (missing.length() > 0) missing.append(", ");
            missing.append("PAYOS_API_KEY");
        }
        if (checksumKey == null || checksumKey.isBlank()) {
            if (missing.length() > 0) missing.append(", ");
            missing.append("PAYOS_CHECKSUM_KEY");
        }
        if (missing.length() > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu cấu hình PayOS: " + missing);
        }
    }

    private record ParsedWebhook(Long orderCode, String status) {
    }
}
