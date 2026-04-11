package com.banvexe.accountmanagement.controller;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('QUAN_TRI')")
public class AdminController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> adminHealth() {
        return ResponseEntity.ok(Map.of("message", "Admin JWT hợp lệ."));
    }
}
