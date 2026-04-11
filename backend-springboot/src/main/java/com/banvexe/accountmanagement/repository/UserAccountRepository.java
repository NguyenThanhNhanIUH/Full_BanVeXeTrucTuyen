package com.banvexe.accountmanagement.repository;

import com.banvexe.accountmanagement.entity.UserAccount;
import com.banvexe.accountmanagement.entity.UserAccount.UserRole;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserAccountRepository extends JpaRepository<UserAccount, Integer> {

    Optional<UserAccount> findByEmail(String email);

    Optional<UserAccount> findByPhone(String phone);

    boolean existsByPhoneAndIdNot(String phone, Integer id);

    @Query("""
        SELECT u FROM UserAccount u
        WHERE u.role = :role
        AND (:q IS NULL OR :q = ''
            OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :q, '%'))
            OR (u.phone IS NOT NULL AND u.phone LIKE CONCAT('%', :q, '%'))
            OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%')))
        """)
    Page<UserAccount> findByRoleWithSearch(
        @Param("role") UserRole role,
        @Param("q") String q,
        Pageable pageable
    );
}
