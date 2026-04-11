package com.banvexe.accountmanagement.repository;

import com.banvexe.accountmanagement.entity.ChuyenXe;
import com.banvexe.accountmanagement.entity.RouteStatus;
import com.banvexe.accountmanagement.entity.TripRunStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChuyenXeRepository extends JpaRepository<ChuyenXe, Integer> {

    @Query("""
        SELECT DISTINCT c FROM ChuyenXe c
        JOIN FETCH c.tuyenXe t
        JOIN FETCH c.xe
        WHERE t.trangThai = :routeStatus
        AND c.trangThai = :tripStatus
        AND c.ngayDi >= :fromDate
        AND (LOWER(t.diemDi) LIKE LOWER(CONCAT('%', :diemDi, '%')))
        AND (LOWER(t.diemDen) LIKE LOWER(CONCAT('%', :diemDen, '%')))
        AND (:ngay IS NULL OR c.ngayDi = :ngay)
        ORDER BY c.ngayDi ASC, c.gioDi ASC
        """)
    List<ChuyenXe> searchTrips(
        @Param("routeStatus") RouteStatus routeStatus,
        @Param("tripStatus") TripRunStatus tripStatus,
        @Param("diemDi") String diemDi,
        @Param("diemDen") String diemDen,
        @Param("ngay") LocalDate ngay,
        @Param("fromDate") LocalDate fromDate
    );

    @Query("""
        SELECT c FROM ChuyenXe c
        JOIN FETCH c.tuyenXe
        JOIN FETCH c.xe
        WHERE c.id = :id
        """)
    Optional<ChuyenXe> findByIdWithDetails(@Param("id") Integer id);

    boolean existsByTuyenXeId(Integer tuyenXeId);
}
