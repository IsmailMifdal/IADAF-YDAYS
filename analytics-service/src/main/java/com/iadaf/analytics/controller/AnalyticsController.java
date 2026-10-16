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

    /**
     * Vues globales — tous les utilisateurs : réservées au
     * scope {@code admin}, qu'aucun jeton ne porte aujourd'hui. Les
     * statistiques de démarches restent ouvertes : elles ne portent que sur
     * les dossiers de l'appelant, cloisonnés par demarches-service.
     */
    private static final String ADMIN = "hasAuthority('SCOPE_admin')";

    private final AnalyticsService analyticsService;

    @GetMapping("/demarches/statut")
    public ResponseEntity<Map<String, Long>> getDemarchesByStatut() {
        log.info("REST request to get demarches statistics by status");
        Map<String, Long> stats = analyticsService.getDemarchesByStatut();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/demarches/type")
    public ResponseEntity<Map<String, Long>> getDemarchesByType() {
        log.info("REST request to get demarches statistics by type");
        Map<String, Long> stats = analyticsService.getDemarchesByType();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/demarches/evolution")
    public ResponseEntity<EvolutionDTO> getDemarchesEvolution(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "DAILY") String period) {
        log.info("REST request to get demarches evolution from {} to {} with period {}", 
                startDate, endDate, period);
        EvolutionDTO evolution = analyticsService.getDemarchesEvolution(startDate, endDate, period);
        return ResponseEntity.ok(evolution);
    }


    @GetMapping("/users/activity")
    @PreAuthorize(ADMIN)
    public ResponseEntity<List<UserActivityDTO>> getUsersActivity() {
        log.info("REST request to get users activity");
        List<UserActivityDTO> activities = analyticsService.getUsersActivity();
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/dashboard")
    @PreAuthorize(ADMIN)
    public ResponseEntity<DashboardSummaryDTO> getDashboardSummary() {
        log.info("REST request to get dashboard summary");
        DashboardSummaryDTO dashboard = analyticsService.getDashboardSummary();
        return ResponseEntity.ok(dashboard);
    }

}
