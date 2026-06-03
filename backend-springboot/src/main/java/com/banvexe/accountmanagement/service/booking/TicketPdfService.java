package com.banvexe.accountmanagement.service.booking;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class TicketPdfService {

    private final QrCodeGenerator qrCodeGenerator;

    public TicketPdfService(QrCodeGenerator qrCodeGenerator) {
        this.qrCodeGenerator = qrCodeGenerator;
    }

    public byte[] buildTicketPdf(String brandName, String customerName, List<TicketPdfRow> rows, String lookupUrl) {
        if (rows == null || rows.isEmpty()) {
            return new byte[0];
        }
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document document = new Document();
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getHelveticaBold(16);
            Font labelFont = FontFactory.getHelveticaBold(10);
            Font valueFont = FontFactory.getHelvetica(10);
            Font smallFont = FontFactory.getHelvetica(9);

            document.add(new Paragraph(brandName == null || brandName.isBlank() ? "VinaGo" : brandName, titleFont));
            document.add(new Paragraph("Vé điện tử", FontFactory.getHelvetica(12)));
            document.add(new Paragraph("Khách: " + safe(customerName), valueFont));
            document.add(new Paragraph(" "));

            for (TicketPdfRow row : rows) {
                document.add(new Paragraph("Mã vé: " + safe(row.maVe()), labelFont));
                document.add(new Paragraph(
                    safe(row.diemDi()) + " → " + safe(row.diemDen()) + " | " + safe(row.ngayDi()) + " " + safe(row.gioDi()),
                    valueFont
                ));
                document.add(new Paragraph("Tuyến: " + safe(row.tenTuyen()), smallFont));
                document.add(new Paragraph("Ghế: " + safe(row.ghe()) + " | Trạng thái: " + safe(row.trangThai()), smallFont));
                document.add(new Paragraph("Tổng tiền: " + formatMoney(row.tongTien()), labelFont));
                document.add(new Paragraph(" "));
            }

            byte[] qrPng = qrCodeGenerator.toPngBytes(lookupUrl, 180);
            if (qrPng.length > 0) {
                Image qr = Image.getInstance(qrPng);
                qr.scaleToFit(120, 120);
                qr.setAlignment(Element.ALIGN_CENTER);
                document.add(new Paragraph("Quét mã QR để tra cứu vé", smallFont));
                document.add(qr);
            }

            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);
            table.setSpacingBefore(8f);
            addRow(table, "Tra cứu online", lookupUrl, labelFont, valueFont);
            document.add(table);

            document.add(new Paragraph(" "));
            document.add(new Paragraph("Vui lòng xuất trình mã vé hoặc QR khi lên xe.", smallFont));

            document.close();
            return out.toByteArray();
        } catch (Exception ex) {
            return new byte[0];
        }
    }

    private void addRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell left = new PdfPCell(new Phrase(label, labelFont));
        left.setBackgroundColor(new Color(245, 245, 245));
        left.setPadding(6f);
        PdfPCell right = new PdfPCell(new Phrase(safe(value), valueFont));
        right.setPadding(6f);
        table.addCell(left);
        table.addCell(right);
    }

    private String formatMoney(BigDecimal value) {
        NumberFormat nf = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));
        nf.setMaximumFractionDigits(0);
        return nf.format(value == null ? BigDecimal.ZERO : value);
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "—" : value.trim();
    }

    public record TicketPdfRow(
        String maVe,
        String trangThai,
        String tenTuyen,
        String diemDi,
        String diemDen,
        String ngayDi,
        String gioDi,
        String ghe,
        BigDecimal tongTien
    ) {
    }
}
