package com.banvexe.accountmanagement.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
    name = "giu_ghe_tam",
    uniqueConstraints = @UniqueConstraint(name = "uk_giu_ghe_tam_chuyen_ghe", columnNames = { "chuyen_xe_id", "so_ghe" })
)
public class GiuGheTam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "chuyen_xe_id", nullable = false)
    private Integer chuyenXeId;

    @Column(name = "so_ghe", nullable = false, length = 10)
    private String soGhe;

    @Column(name = "hold_token", nullable = false, length = 64)
    private String holdToken;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
}
