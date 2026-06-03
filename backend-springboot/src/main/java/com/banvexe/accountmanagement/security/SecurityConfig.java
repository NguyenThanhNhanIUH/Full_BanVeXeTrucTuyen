package com.banvexe.accountmanagement.security;

import java.util.Arrays;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final String allowedOrigins;

    public SecurityConfig(
        JwtAuthenticationFilter jwtAuthenticationFilter,
        @Value("${app.cors.allowed-origins:http://localhost:5173}") String allowedOrigins
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.allowedOrigins = allowedOrigins;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/register").permitAll()
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/api/auth/verify-email").permitAll()
                .requestMatchers("/api/auth/resend-otp").permitAll()
                .requestMatchers("/api/auth/forgot-password/**").permitAll()
                .requestMatchers("/api/accounts/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/catalog/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/catalog/trips/*/seats/hold", "/api/catalog/trips/*/seats/release").permitAll()
                .requestMatchers("/api/public/booking/**").permitAll()
                .requestMatchers("/api/public/assistant/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/public/branding").permitAll()
                .requestMatchers("/api/accounts/me/**").authenticated()
                .requestMatchers("/api/auth/me").authenticated()
                .requestMatchers("/api/me/booking/**").hasRole("KHACH_HANG")
                .requestMatchers("/api/me/notifications/**").hasRole("KHACH_HANG")
                .requestMatchers("/api/staff/**").hasAnyRole("NHAN_VIEN", "QUAN_TRI")
                .requestMatchers(HttpMethod.GET, "/api/manager/trips", "/api/manager/routes", "/api/manager/vehicles", "/api/manager/tickets", "/api/manager/tickets/stats", "/api/manager/revenue/**")
                    .hasAnyRole("NHAN_VIEN", "QUAN_TRI")
                .requestMatchers(HttpMethod.GET, "/api/manager/tickets/*").hasAnyRole("NHAN_VIEN", "QUAN_TRI")
                .requestMatchers("/api/manager/**").hasRole("QUAN_TRI")
                .requestMatchers(HttpMethod.GET, "/api/admin/dashboard", "/api/admin/dashboard/**")
                    .hasAnyRole("NHAN_VIEN", "QUAN_TRI")
                .requestMatchers("/api/admin/customers", "/api/admin/customers/**").hasAnyRole("NHAN_VIEN", "QUAN_TRI")
                .requestMatchers("/api/admin/staffs", "/api/admin/staffs/**").hasRole("QUAN_TRI")
                .requestMatchers("/api/admin/**").hasRole("QUAN_TRI")
                .anyRequest().denyAll()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(s -> !s.isBlank())
            .toList();
        config.setAllowedOrigins(origins.isEmpty() ? List.of("http://localhost:5173") : origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setExposedHeaders(List.of("Authorization", "Content-Type"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
