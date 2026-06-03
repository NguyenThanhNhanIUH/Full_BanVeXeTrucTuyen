package com.banvexe.accountmanagement.repository;

import com.banvexe.accountmanagement.entity.GiuGheTam;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GiuGheTamRepository extends JpaRepository<GiuGheTam, Long> {

    Optional<GiuGheTam> findByChuyenXeIdAndSoGhe(Integer chuyenXeId, String soGhe);

    List<GiuGheTam> findByChuyenXeIdAndExpiresAtAfter(Integer chuyenXeId, Instant now);

    long countByHoldTokenAndChuyenXeIdAndExpiresAtAfter(String holdToken, Integer chuyenXeId, Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    void deleteByChuyenXeIdAndSoGheAndHoldToken(Integer chuyenXeId, String soGhe, String holdToken);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    void deleteByHoldTokenAndChuyenXeId(String holdToken, Integer chuyenXeId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM GiuGheTam g WHERE g.chuyenXeId = :chuyenId AND g.soGhe IN :seats")
    void deleteByChuyenXeIdAndSoGheIn(@Param("chuyenId") Integer chuyenId, @Param("seats") Collection<String> seats);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM GiuGheTam g WHERE g.expiresAt <= :cutoff")
    int deleteByExpiresAtLessThanEqual(@Param("cutoff") Instant cutoff);

    @Query("SELECT DISTINCT g.chuyenXeId FROM GiuGheTam g WHERE g.expiresAt <= :cutoff")
    List<Integer> findDistinctChuyenXeIdByExpiresAtLessThanEqual(@Param("cutoff") Instant cutoff);
}
