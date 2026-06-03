package com.banvexe.accountmanagement.repository;

import com.banvexe.accountmanagement.entity.ThongBao;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ThongBaoRepository extends JpaRepository<ThongBao, Long> {

    List<ThongBao> findTop50ByKhachHangIdOrderByCreatedAtDesc(Integer khachHangId);

    long countByKhachHangIdAndDaDocFalse(Integer khachHangId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update ThongBao t set t.daDoc = true where t.id = :id and t.khachHangId = :khId")
    int markRead(@Param("id") Long id, @Param("khId") Integer khachHangId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update ThongBao t set t.daDoc = true where t.khachHangId = :khId and t.daDoc = false")
    int markAllRead(@Param("khId") Integer khachHangId);
}
