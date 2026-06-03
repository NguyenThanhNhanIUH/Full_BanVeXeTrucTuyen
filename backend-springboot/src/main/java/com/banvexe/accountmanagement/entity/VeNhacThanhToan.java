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
@Table(name = "ve_nhac_thanh_toan")
public class VeNhacThanhToan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ve_xe_id", nullable = false)
    private Integer veXeId;

    /** 7_DAY, 3_DAY, 1_DAY */
    @Column(name = "loai_nhac", nullable = false, length = 20)
    private String loaiNhac;

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt = Instant.now();
}
