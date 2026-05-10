package com.banvexe.accountmanagement.repository;

import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.entity.VeXe;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VeXeRepository extends JpaRepository<VeXe, Integer> {

    List<VeXe> findByChuyenXe_Id(Integer chuyenXeId);

    long countByTrangThai(TicketStatus trangThai);

    @Query("select v.ngayDat, v.tongTien from VeXe v where v.trangThai in :statuses")
    List<Object[]> findNgayDatAndTongTienByTrangThaiIn(@Param("statuses") Collection<TicketStatus> statuses);

    boolean existsByMaVeAndIdNot(String maVe, Integer id);

    Optional<VeXe> findByMaVe(String maVe);

    Optional<VeXe> findByMaVeIgnoreCase(String maVe);

    List<VeXe> findByKhachHangIdOrderByNgayDatDesc(Integer khachHangId);

    List<VeXe> findTop200ByTrangThaiAndNgayDatBeforeOrderByNgayDatAsc(TicketStatus trangThai, Instant cutoff);

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

    /**
     * Chỉ join-fetch chuyến; tuyến load lazy trong cùng transaction (tránh HQL lồng
     * {@code left join fetch c.tuyenXe} gây lỗi tạo SQL trên một số bản Hibernate/MariaDB).
     * Phân trang cắt slice trong service.
     */
    @Query("select v from VeXe v left join fetch v.chuyenXe c order by v.ngayDat desc")
    List<VeXe> findAllForManagerListWithFetches();

    @Query("select v from VeXe v left join fetch v.chuyenXe c where v.trangThai = :st order by v.ngayDat desc")
    List<VeXe> findByTrangThaiForManagerListWithFetches(@Param("st") TicketStatus st);

    /**
     * Ghi đè trạng thái + ghi chú một cách tường minh (tránh trường hợp bản thực thể
     * đồng bộ từ cache không phát sinh UPDATE đúng trường ghi chú).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update VeXe v set v.ghiChu = :g, v.trangThai = :s where v.id = :id")
    int updateGhiChuAndTrangThaiById(
        @Param("id") Integer id,
        @Param("g") String g,
        @Param("s") TicketStatus s
    );
}
