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
@Table(name = "ThanhToan")
public class ThanhToan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ve_xe_id", nullable = false)
    private VeXe veXe;

    @Column(name = "so_tien", nullable = false, precision = 10, scale = 2)
    private BigDecimal soTien;

    @Enumerated(EnumType.STRING)
    @Column(name = "phuong_thuc", nullable = false)
    private PaymentMethod phuongThuc;

    @Column(name = "ma_giao_dich", length = 100)
    private String maGiaoDich;

    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai", nullable = false)
    private PaymentTxnStatus trangThai = PaymentTxnStatus.DANG_XU_LY;

    @Column(name = "ngay_thanh_toan", nullable = false)
    private Instant ngayThanhToan = Instant.now();
}
