package com.banvexe.accountmanagement.service.booking;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.banvexe.accountmanagement.entity.PaymentTxnStatus;
import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.entity.ThanhToan;
import com.banvexe.accountmanagement.entity.VeXe;
import com.banvexe.accountmanagement.repository.KhachHangRepository;
import com.banvexe.accountmanagement.repository.ThanhToanRepository;
import com.banvexe.accountmanagement.repository.VeXeRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class PayOsServiceWebhookTest {

    @Mock
    private VeXeRepository veXeRepository;

    @Mock
    private ThanhToanRepository thanhToanRepository;

    @Mock
    private KhachHangRepository khachHangRepository;

    @Mock
    private BookingNotificationService bookingNotificationService;

    @Test
    void handleWebhook_rejectsInvalidSignature() {
        PayOsService service = new PayOsService(
            veXeRepository,
            thanhToanRepository,
            khachHangRepository,
            bookingNotificationService,
            new ObjectMapper()
        );
        ReflectionTestUtils.setField(service, "checksumKey", "test-secret");

        Map<String, Object> data = new HashMap<>();
        data.put("orderCode", 123456L);
        data.put("status", "PAID");
        Map<String, Object> payload = new HashMap<>();
        payload.put("data", data);
        payload.put("signature", "invalid-signature");

        assertThatThrownBy(() -> service.handleWebhook(payload))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Webhook signature không hợp lệ");
        verify(thanhToanRepository, never()).findByMaGiaoDichForUpdate("PAYOS-PENDING-123456");
    }

    @Test
    void handleWebhook_acceptsValidSignatureAndFinalizesPayment() {
        PayOsService service = new PayOsService(
            veXeRepository,
            thanhToanRepository,
            khachHangRepository,
            bookingNotificationService,
            new ObjectMapper()
        );
        ReflectionTestUtils.setField(service, "checksumKey", "test-secret");

        VeXe ve = new VeXe();
        ve.setTrangThai(TicketStatus.CHO_THANH_TOAN);

        ThanhToan tx = new ThanhToan();
        tx.setTrangThai(PaymentTxnStatus.DANG_XU_LY);
        tx.setVeXe(ve);

        when(thanhToanRepository.findByMaGiaoDichForUpdate("PAYOS-PENDING-123456")).thenReturn(List.of(tx));

        Map<String, Object> data = new HashMap<>();
        data.put("orderCode", 123456L);
        data.put("status", "PAID");
        String signature = signWebhookData(data, "test-secret");
        Map<String, Object> payload = new HashMap<>();
        payload.put("data", data);
        payload.put("signature", signature);

        service.handleWebhook(payload);

        verify(thanhToanRepository).save(tx);
        verify(veXeRepository).save(ve);
    }

    @Test
    void handleWebhook_pendingStatus_doesNotTouchDatabase() {
        PayOsService service = new PayOsService(
            veXeRepository,
            thanhToanRepository,
            khachHangRepository,
            bookingNotificationService,
            new ObjectMapper()
        );
        ReflectionTestUtils.setField(service, "checksumKey", "test-secret");

        Map<String, Object> data = new HashMap<>();
        data.put("orderCode", 123456L);
        data.put("status", "PENDING");
        String signature = signWebhookData(data, "test-secret");
        Map<String, Object> payload = new HashMap<>();
        payload.put("data", data);
        payload.put("signature", signature);

        service.handleWebhook(payload);

        verify(thanhToanRepository, never()).findByMaGiaoDichForUpdate(anyString());
        verify(thanhToanRepository, never()).save(any());
        verify(veXeRepository, never()).save(any());
    }

    @Test
    void handleWebhook_paid_loadsTxnsFromFailedPrefixWhenPendingGone() {
        PayOsService service = new PayOsService(
            veXeRepository,
            thanhToanRepository,
            khachHangRepository,
            bookingNotificationService,
            new ObjectMapper()
        );
        ReflectionTestUtils.setField(service, "checksumKey", "test-secret");

        VeXe ve = new VeXe();
        ve.setTrangThai(TicketStatus.CHO_THANH_TOAN);

        ThanhToan tx = new ThanhToan();
        tx.setTrangThai(PaymentTxnStatus.THAT_BAI);
        tx.setVeXe(ve);

        when(thanhToanRepository.findByMaGiaoDichForUpdate("PAYOS-PENDING-123456")).thenReturn(List.of());
        when(thanhToanRepository.findByMaGiaoDichForUpdate("PAYOS-FAILED-123456")).thenReturn(List.of(tx));

        Map<String, Object> data = new HashMap<>();
        data.put("orderCode", 123456L);
        data.put("status", "PAID");
        String signature = signWebhookData(data, "test-secret");
        Map<String, Object> payload = new HashMap<>();
        payload.put("data", data);
        payload.put("signature", signature);

        service.handleWebhook(payload);

        verify(thanhToanRepository).save(tx);
        verify(veXeRepository).save(ve);
    }

    private static String signWebhookData(Map<String, Object> data, String secret) {
        String signData = data.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(entry -> entry.getKey() + "=" + String.valueOf(entry.getValue()))
            .collect(Collectors.joining("&"));
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(signData.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
