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
import java.time.LocalDate;
import java.time.LocalTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "ChuyenXe")
public class ChuyenXe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tuyen_xe_id", nullable = false)
    private TuyenXe tuyenXe;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "xe_id", nullable = false)
    private Xe xe;

    @Column(name = "ngay_di", nullable = false)
    private LocalDate ngayDi;

    @Column(name = "gio_di", nullable = false)
    private LocalTime gioDi;

    @Column(name = "gia_ve", nullable = false, precision = 10, scale = 2)
    private BigDecimal giaVe;

    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai", nullable = false)
    private TripRunStatus trangThai = TripRunStatus.CHUA_KHOI_HANH;
}
