package com.iadaf.analytics.controller;

import com.iadaf.analytics.dto.*;
import com.iadaf.analytics.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
@Slf4j
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/demarches/statut")
    @PreAuthorize("hasAnyRole('SUPPORT', 'ADMIN')")
    public ResponseEntity<Map<String, Long>> getDemarchesByStatut() {
        log.info("REST request to get demarches statistics by status");
        Map<String, Long> stats = analyticsService.getDemarchesByStatut();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/demarches/type")
    @PreAuthorize("hasAnyRole('SUPPORT', 'ADMIN')")
    public ResponseEntity<Map<String, Long>> getDemarchesByType() {
        log.info("REST request to get demarches statistics by type");
        Map<String, Long> stats = analyticsService.getDemarchesByType();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/demarches/evolution")
    @PreAuthorize("hasAnyRole('SUPPORT', 'ADMIN')")
    public ResponseEntity<EvolutionDTO> getDemarchesEvolution(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "DAILY") String period) {
        log.info("REST request to get demarches evolution from {} to {} with period {}", 
                startDate, endDate, period);
        EvolutionDTO evolution = analyticsService.getDemarchesEvolution(startDate, endDate, period);
        return ResponseEntity.ok(evolution);
    }

    @GetMapping("/documents/stats")
    @PreAuthorize("hasAnyRole('SUPPORT', 'ADMIN')")
    public ResponseEntity<DocumentStatsDTO> getDocumentStats() {
        log.info("REST request to get document statistics");
        DocumentStatsDTO stats = analyticsService.getDocumentStats();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/users/activity")
    @PreAuthorize("hasAnyRole('SUPPORT', 'ADMIN')")
    public ResponseEntity<List<UserActivityDTO>> getUsersActivity() {
        log.info("REST request to get users activity");
        List<UserActivityDTO> activities = analyticsService.getUsersActivity();
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('SUPPORT', 'ADMIN', 'USER')")
    public ResponseEntity<DashboardSummaryDTO> getDashboardSummary() {
        log.info("REST request to get dashboard summary");
        DashboardSummaryDTO dashboard = analyticsService.getDashboardSummary();
        return ResponseEntity.ok(dashboard);
    }

    @GetMapping("/performance")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PerformanceMetricsDTO> getPerformanceMetrics() {
        log.info("REST request to get performance metrics");
        PerformanceMetricsDTO metrics = analyticsService.getPerformanceMetrics();
        return ResponseEntity.ok(metrics);
    }
}
