package com.banvexe.accountmanagement.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class SeatHoldSchemaRunner implements ApplicationRunner, Ordered {

    private static final Logger log = LoggerFactory.getLogger(SeatHoldSchemaRunner.class);

    private final JdbcTemplate jdbcTemplate;

    public SeatHoldSchemaRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 5;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS giu_ghe_tam (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    chuyen_xe_id INT NOT NULL,
                    so_ghe VARCHAR(10) NOT NULL,
                    hold_token VARCHAR(64) NOT NULL,
                    expires_at DATETIME(6) NOT NULL,
                    UNIQUE KEY uk_giu_ghe_tam_chuyen_ghe (chuyen_xe_id, so_ghe),
                    KEY idx_giu_ghe_tam_expires (expires_at)
                )
                """);
            log.info("Seat hold table giu_ghe_tam is ready.");
        } catch (Exception ex) {
            log.warn("Skip giu_ghe_tam schema init: {}", ex.getMessage());
        }
    }
}
