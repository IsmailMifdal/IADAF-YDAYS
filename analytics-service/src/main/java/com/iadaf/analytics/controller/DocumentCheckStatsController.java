package com.iadaf.analytics.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Comptes anonymes des pré-vérifications de pièces (Phase 4).
 *
 * <p>L'entrée est validée strictement : une catégorie et des identifiants de
 * contrôle tirés d'un vocabulaire fermé, aucun texte libre. Rien ne permet d'y
 * glisser une donnée personnelle, même par erreur.
 */
@Validated
@RestController
@RequestMapping("/analytics/document-checks")
@RequiredArgsConstructor
public class DocumentCheckStatsController {

    private final NamedParameterJdbcTemplate jdbc;

    public record CheckOutcome(
            @NotNull @Pattern(regexp = "[a-z_]{1,30}") String id,
            @NotNull @Pattern(regexp = "ok|warning|error|unknown") String status) {
    }

    public record DocumentChecks(
            @NotNull @Pattern(regexp = "identity|address|bank|other") String category,
            @NotNull @Size(max = 20) List<@Valid @NotNull CheckOutcome> checks) {
    }

    /** Ajoute une pré-vérification aux comptes du jour. */
    @PostMapping
    @Transactional
    public ResponseEntity<Void> record(@Valid @RequestBody DocumentChecks body) {
        for (CheckOutcome check : body.checks()) {
            jdbc.update("""
                    INSERT INTO analytics.document_check_counts (day, category, check_id, status, count)
                    VALUES (CURRENT_DATE, :category, :checkId, :status, 1)
                    ON CONFLICT (day, category, check_id, status)
                    DO UPDATE SET count = analytics.document_check_counts.count + 1
                    """, new MapSqlParameterSource()
                    .addValue("category", body.category())
                    .addValue("checkId", check.id())
                    .addValue("status", check.status()));
        }
        return ResponseEntity.noContent().build();
    }

    /**
     * Totaux sur les {@code days} derniers jours. Réservé au scope
     * {@code analytics:read} : ce sont des statistiques d'exploitation, pas une
     * donnée d'utilisateur.
     */
    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_analytics:read')")
    public List<Map<String, Object>> totals(@RequestParam(defaultValue = "30") int days) {
        int window = Math.max(1, Math.min(days, 366));
        return jdbc.queryForList("""
                SELECT category, check_id AS "checkId", status, SUM(count)::int AS count
                  FROM analytics.document_check_counts
                 WHERE day > :since
                 GROUP BY category, check_id, status
                 ORDER BY category, check_id, status
                """, Map.of("since", LocalDate.now().minusDays(window)));
    }
}
