package com.banvexe.accountmanagement.config;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DeferredBookingSchemaRunner implements ApplicationRunner, Ordered {

    private static final Logger log = LoggerFactory.getLogger(DeferredBookingSchemaRunner.class);

    private final JdbcTemplate jdbcTemplate;

    public DeferredBookingSchemaRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 6;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            String ticketTable = resolveTicketTableName();
            if (ticketTable != null) {
                ensureDatTruocTicketStatus(ticketTable);
                ensureColumn(ticketTable, "han_thanh_toan", "DATETIME(6) NULL");
            } else {
                log.warn("Ticket table not found; skip deferred booking column migration.");
            }

            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS thong_bao (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    khach_hang_id INT NOT NULL,
                    tieu_de VARCHAR(200) NOT NULL,
                    noi_dung TEXT NOT NULL,
                    loai VARCHAR(50) NULL,
                    ve_xe_id INT NULL,
                    da_doc TINYINT(1) NOT NULL DEFAULT 0,
                    created_at DATETIME(6) NOT NULL,
                    KEY idx_thong_bao_kh (khach_hang_id, created_at)
                )
                """);
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS ve_nhac_thanh_toan (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    ve_xe_id INT NOT NULL,
                    loai_nhac VARCHAR(20) NOT NULL,
                    sent_at DATETIME(6) NOT NULL,
                    UNIQUE KEY uk_ve_nhac (ve_xe_id, loai_nhac)
                )
                """);
            log.info("Deferred booking schema is ready.");
        } catch (Exception ex) {
            log.warn("Skip deferred booking schema init: {}", ex.getMessage());
        }
    }

    private String resolveTicketTableName() {
        for (String candidate : List.of("VeXe", "vexe", "VEXE")) {
            Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*) FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
                """,
                Integer.class,
                candidate
            );
            if (count != null && count > 0) {
                return candidate;
            }
        }
        return null;
    }

    private void ensureDatTruocTicketStatus(String table) {
        String columnType = jdbcTemplate.queryForObject(
            """
            SELECT COLUMN_TYPE FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'trang_thai'
            """,
            String.class,
            table
        );
        if (columnType != null && columnType.contains("DAT_TRUOC")) {
            return;
        }
        jdbcTemplate.execute(
            "ALTER TABLE " + table + " MODIFY COLUMN trang_thai ENUM("
                + "'CHO_THANH_TOAN', 'DAT_TRUOC', 'DA_THANH_TOAN', 'DANG_XU_LY', 'DA_HUY', 'HOAN_THANH'"
                + ") DEFAULT 'CHO_THANH_TOAN'"
        );
        log.info("Added DAT_TRUOC to {}.trang_thai enum.", table);
    }

    private void ensureColumn(String table, String column, String ddl) {
        Integer count = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
            """,
            Integer.class,
            table,
            column
        );
        if (count == null || count == 0) {
            jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + ddl);
        }
    }
}
