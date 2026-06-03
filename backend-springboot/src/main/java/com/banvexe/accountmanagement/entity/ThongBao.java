package com.banvexe.accountmanagement.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "thong_bao")
public class ThongBao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "khach_hang_id", nullable = false)
    private Integer khachHangId;

    @Column(name = "tieu_de", nullable = false, length = 200)
    private String tieuDe;

    @Column(name = "noi_dung", nullable = false, columnDefinition = "TEXT")
    private String noiDung;

    @Column(name = "loai", length = 50)
    private String loai;

    @Column(name = "ve_xe_id")
    private Integer veXeId;

    @Column(name = "da_doc", nullable = false)
    private boolean daDoc = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
