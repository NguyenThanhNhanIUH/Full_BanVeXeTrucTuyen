package com.banvexe.accountmanagement.repository;

import com.banvexe.accountmanagement.entity.VeXe;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VeXeRepository extends JpaRepository<VeXe, Integer> {

    Optional<VeXe> findByMaVe(String maVe);

    List<VeXe> findByKhachHangIdOrderByNgayDatDesc(Integer khachHangId);

    Optional<VeXe> findByIdAndKhachHangId(Integer id, Integer khachHangId);

    @Query("""
        SELECT DISTINCT v FROM VeXe v
        JOIN FETCH v.chuyenXe c
        JOIN FETCH c.tuyenXe
        JOIN FETCH c.xe
        WHERE v.khachHangId = :khachHangId
        ORDER BY v.ngayDat DESC
        """)
    List<VeXe> findAllByKhachHangIdWithRoute(@Param("khachHangId") Integer khachHangId);

    @Query("""
        SELECT v FROM VeXe v
        JOIN FETCH v.chuyenXe c
        JOIN FETCH c.tuyenXe
        JOIN FETCH c.xe
        WHERE v.id = :id
        """)
    Optional<VeXe> findByIdWithDetails(@Param("id") Integer id);
}
