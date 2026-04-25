package com.banvexe.accountmanagement.repository;

import com.banvexe.accountmanagement.entity.RouteStatus;
import com.banvexe.accountmanagement.entity.TuyenXe;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TuyenXeRepository extends JpaRepository<TuyenXe, Integer> {

    @Query("""
        SELECT t FROM TuyenXe t
        WHERE t.trangThai = :status
        AND (LOWER(t.diemDi) LIKE LOWER(CONCAT('%', :diemDi, '%')))
        AND (LOWER(t.diemDen) LIKE LOWER(CONCAT('%', :diemDen, '%')))
        ORDER BY t.tenTuyen
        """)
    List<TuyenXe> searchRoutes(
        @Param("status") RouteStatus status,
        @Param("diemDi") String diemDi,
        @Param("diemDen") String diemDen
    );

    @Query("""
        SELECT DISTINCT t.diemDi FROM TuyenXe t
        WHERE t.trangThai = :status
        AND LOWER(t.diemDi) LIKE LOWER(CONCAT('%', :keyword, '%'))
        ORDER BY t.diemDi
        """)
    List<String> suggestOrigins(@Param("status") RouteStatus status, @Param("keyword") String keyword);

    @Query("""
        SELECT DISTINCT t.diemDen FROM TuyenXe t
        WHERE t.trangThai = :status
        AND LOWER(t.diemDen) LIKE LOWER(CONCAT('%', :keyword, '%'))
        ORDER BY t.diemDen
        """)
    List<String> suggestDestinations(@Param("status") RouteStatus status, @Param("keyword") String keyword);
}
