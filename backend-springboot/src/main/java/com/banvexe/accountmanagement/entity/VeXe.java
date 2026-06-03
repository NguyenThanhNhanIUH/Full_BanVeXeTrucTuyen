package com.banvexe.accountmanagement.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "vexe")
public class VeXe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "ma_ve", nullable = false, unique = true, length = 20)
    private String maVe;

    @Column(name = "khach_hang_id", nullable = false)
    private Integer khachHangId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chuyen_xe_id", nullable = false)
    private ChuyenXe chuyenXe;

    @Column(name = "ngay_dat", nullable = false)
    private Instant ngayDat;

    @Column(name = "so_luong_ghe", nullable = false)
    private Integer soLuongGhe;

    @Column(name = "tong_tien", nullable = false, precision = 10, scale = 2)
    private BigDecimal tongTien;

    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai", nullable = false)
    private TicketStatus trangThai;

    @Column(name = "ghi_chu", columnDefinition = "TEXT")
    private String ghiChu;

    /** Hạn thanh toán cho vé đặt trước (DAT_TRUOC). */
    @Column(name = "han_thanh_toan")
    private Instant hanThanhToan;
}
