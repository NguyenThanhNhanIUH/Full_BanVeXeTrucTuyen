package com.banvexe.accountmanagement.repository;

import com.banvexe.accountmanagement.entity.ChiTietVe;
import com.banvexe.accountmanagement.entity.TicketStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChiTietVeRepository extends JpaRepository<ChiTietVe, Integer> {

    @Query("""
        SELECT DISTINCT ct.soGhe FROM ChiTietVe ct
        JOIN ct.veXe v
        WHERE v.chuyenXe.id = :chuyenId
        AND v.trangThai IN :statuses
        """)
    List<String> findOccupiedSeatCodes(
        @Param("chuyenId") Integer chuyenId,
        @Param("statuses") Collection<TicketStatus> statuses
    );

    List<ChiTietVe> findByVeXeId(Integer veXeId);

    void deleteByVeXeId(Integer veXeId);
}
