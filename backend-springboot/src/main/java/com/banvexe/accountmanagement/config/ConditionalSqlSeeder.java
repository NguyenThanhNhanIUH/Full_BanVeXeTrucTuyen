package com.banvexe.accountmanagement.config;

import java.io.File;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import javax.sql.DataSource;
import java.sql.Connection;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.Ordered;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class ConditionalSqlSeeder implements ApplicationRunner, Ordered {

    private static final Logger log = LoggerFactory.getLogger(ConditionalSqlSeeder.class);

    private final DataSource dataSource;

    public ConditionalSqlSeeder(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    // Example: enable/disable seeding completely.
    @Value("${app.db.seed.enabled:true}")
    private boolean enabled;

    // File path for SQL script (relative to backend-springboot working directory when running mvn spring-boot:run).
    @Value("${app.db.seed.script:../database/data.sql}")
    private String scriptPath;

    // If any of these tables is missing, we consider DB "not initialized" and run the script.
    @Value("${app.db.seed.required-tables:khach_hang,tai_khoan,ChiTietVe}")
    private String requiredTablesCsv;

    // If this table has no rows, we still run seed (useful when Hibernate created empty schema).
    @Value("${app.db.seed.required-row-check-table:TuyenXe}")
    private String requiredRowCheckTable;

    // Optional repair mode: if garbled Vietnamese is detected, clear and reseed data.
    @Value("${app.db.seed.reseed-if-garbled:false}")
    private boolean reseedIfGarbled;

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("DB seed disabled (app.db.seed.enabled=false).");
            return;
        }

        List<String> requiredTables = parseTables(requiredTablesCsv);
        boolean allExist = requiredTables.stream().allMatch(this::tableExistsCaseInsensitive);
        boolean hasSeedData = hasRows(requiredRowCheckTable);
        boolean garbled = reseedIfGarbled && hasGarbledVietnamese();

        if (allExist && hasSeedData && !garbled) {
            log.info(
                "DB already initialized (tables exist and {} has data). Skip running seed script: {}",
                requiredRowCheckTable,
                scriptPath
            );
            return;
        }

        File scriptFile = new File(scriptPath);
        if (!scriptFile.exists() || !scriptFile.isFile()) {
            throw new IllegalStateException("Seed script not found: " + scriptFile.getAbsolutePath());
        }

        log.warn("DB not initialized (missing tables). Running seed script: {}", scriptFile.getAbsolutePath());
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
        populator.addScript(new FileSystemResource(scriptFile));
        populator.setSqlScriptEncoding("UTF-8");
        // For partially initialized DBs, skip "already exists"/duplicate rows and finish remaining statements.
        populator.setContinueOnError(true);
        try (Connection connection = Objects.requireNonNull(dataSource).getConnection()) {
            if (garbled) {
                log.warn("Detected garbled Vietnamese data. Truncating tables and reseeding from UTF-8 script.");
                truncateKnownTables(connection);
            }
            populator.populate(Objects.requireNonNull(connection));
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to run seed script: " + scriptFile.getAbsolutePath(), ex);
        }
        log.info("Seed script executed successfully.");
    }

    @Override
    public int getOrder() {
        // After web server is up so Railway/Render healthchecks can pass while seed runs.
        return Ordered.LOWEST_PRECEDENCE;
    }

    private List<String> parseTables(String csv) {
        if (!StringUtils.hasText(csv)) return List.of();
        return Arrays.stream(csv.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();
    }

    private boolean tableExistsCaseInsensitive(String tableName) {
        if (!StringUtils.hasText(tableName)) return true;
        String lower = tableName.trim().toLowerCase(Locale.ROOT);
        JdbcTemplate jdbc = new JdbcTemplate(Objects.requireNonNull(dataSource));
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM information_schema.tables " +
                "WHERE table_schema = DATABASE() AND LOWER(table_name) = ?",
            Integer.class,
            lower
        );
        return count != null && count > 0;
    }

    private boolean hasRows(String tableName) {
        if (!StringUtils.hasText(tableName)) return true;
        Optional<String> actualTableName = resolveActualTableName(tableName);
        if (actualTableName.isEmpty()) return false;
        JdbcTemplate jdbc = new JdbcTemplate(Objects.requireNonNull(dataSource));
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM `" + actualTableName.get() + "`", Integer.class);
        return count != null && count > 0;
    }

    private Optional<String> resolveActualTableName(String tableName) {
        if (!StringUtils.hasText(tableName)) return Optional.empty();
        JdbcTemplate jdbc = new JdbcTemplate(Objects.requireNonNull(dataSource));
        List<String> names = jdbc.queryForList(
            "SELECT table_name FROM information_schema.tables " +
                "WHERE table_schema = DATABASE() AND LOWER(table_name) = ? LIMIT 1",
            String.class,
            tableName.trim().toLowerCase(Locale.ROOT)
        );
        if (names == null || names.isEmpty()) return Optional.empty();
        return Optional.ofNullable(names.get(0));
    }

    private boolean hasGarbledVietnamese() {
        try {
            Optional<String> routeTable = resolveActualTableName("TuyenXe");
            if (routeTable.isEmpty()) return false;
            JdbcTemplate jdbc = new JdbcTemplate(Objects.requireNonNull(dataSource));
            Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM `" + routeTable.get() + "` " +
                    "WHERE ten_tuyen LIKE '%Ã%' OR ten_tuyen LIKE '%�%' OR diem_di LIKE '%Ã%' OR diem_di LIKE '%�%' " +
                    "OR diem_den LIKE '%Ã%' OR diem_den LIKE '%�%'",
                Integer.class
            );
            return count != null && count > 0;
        } catch (Exception ex) {
            log.warn("Skip garbled-data detection due to: {}", ex.getMessage());
            return false;
        }
    }

    private void truncateKnownTables(Connection connection) throws Exception {
        List<String> tables = List.of(
            "ChiTietVe",
            "ThanhToan",
            "VeXe",
            "ChuyenXe",
            "TuyenXe",
            "Xe",
            "tai_khoan",
            "khach_hang",
            "cau_hinh_giao_dien"
        );
        JdbcTemplate jdbc = new JdbcTemplate(Objects.requireNonNull(dataSource));
        jdbc.execute("SET FOREIGN_KEY_CHECKS=0");
        for (String t : tables) {
            Optional<String> actual = resolveActualTableName(t);
            if (actual.isPresent()) {
                jdbc.execute("DROP TABLE IF EXISTS `" + actual.get() + "`");
            }
        }
        jdbc.execute("SET FOREIGN_KEY_CHECKS=1");
    }
}

