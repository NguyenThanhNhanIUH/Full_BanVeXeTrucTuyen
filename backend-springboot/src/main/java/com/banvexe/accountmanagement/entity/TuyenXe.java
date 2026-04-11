package com.banvexe.accountmanagement.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "TuyenXe")
public class TuyenXe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "ten_tuyen", nullable = false)
    private String tenTuyen;

    @Column(name = "diem_di", nullable = false, length = 100)
    private String diemDi;

    @Column(name = "diem_den", nullable = false, length = 100)
    private String diemDen;

    @Column(name = "khoang_cach", precision = 10, scale = 2)
    private BigDecimal khoangCach;

    @Column(name = "thoi_gian_du_kien")
    private Integer thoiGianDuKien;

    @Column(name = "gia_ve_co_ban", nullable = false, precision = 10, scale = 2)
    private BigDecimal giaVeCoBan;

    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai", nullable = false)
    private RouteStatus trangThai = RouteStatus.ACTIVE;
}
