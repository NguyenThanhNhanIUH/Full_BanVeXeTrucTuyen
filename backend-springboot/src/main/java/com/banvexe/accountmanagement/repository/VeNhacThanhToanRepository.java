package com.banvexe.accountmanagement.repository;

import com.banvexe.accountmanagement.entity.VeNhacThanhToan;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VeNhacThanhToanRepository extends JpaRepository<VeNhacThanhToan, Long> {

    boolean existsByVeXeIdAndLoaiNhac(Integer veXeId, String loaiNhac);
}
