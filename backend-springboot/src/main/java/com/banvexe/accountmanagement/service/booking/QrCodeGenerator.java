package com.banvexe.accountmanagement.service.booking;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import org.springframework.stereotype.Component;

@Component
public class QrCodeGenerator {

    public byte[] toPngBytes(String content, int size) {
        if (content == null || content.isBlank()) {
            return new byte[0];
        }
        try {
            BitMatrix matrix = new QRCodeWriter().encode(content.trim(), BarcodeFormat.QR_CODE, size, size);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return out.toByteArray();
        } catch (Exception ex) {
            return new byte[0];
        }
    }

    public String toDataUri(String content, int size) {
        byte[] png = toPngBytes(content, size);
        if (png.length == 0) {
            return "";
        }
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(png);
    }
}
