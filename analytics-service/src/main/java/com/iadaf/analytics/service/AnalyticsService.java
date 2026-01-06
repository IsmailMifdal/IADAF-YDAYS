package com.iadaf.analytics.service;

import com.iadaf.analytics.dto.*;
import com.iadaf.analytics.exception.ServiceUnavailableException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private final RestTemplate restTemplate;

    @Value("${services.user-service.url}")
    private String userServiceUrl;

    @Value("${services.demarches-service.url}")
    private String demarchesServiceUrl;

    @Value("${services.document-service.url}")
    private String documentServiceUrl;

    @Cacheable(value = "demarcheStats", key = "'byStatut'")
    public Map<String, Long> getDemarchesByStatut() {
        log.info("Fetching demarches statistics by status");
        try {
            String url = demarchesServiceUrl + "/demarches";
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );

            List<Map<String, Object>> demarches = response.getBody();
            if (demarches == null) {
                return new HashMap<>();
            }

            return demarches.stream()
                    .collect(Collectors.groupingBy(
                            d -> (String) d.get("statut"),
                            Collectors.counting()
                    ));
        } catch (RestClientException e) {
            log.error("Error fetching demarches by status", e);
            throw new ServiceUnavailableException("demarches-service", e);
        }
    }

    @Cacheable(value = "demarcheStats", key = "'byType'")
    public Map<String, Long> getDemarchesByType() {
        log.info("Fetching demarches statistics by type");
        try {
            String url = demarchesServiceUrl + "/demarches";
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );

            List<Map<String, Object>> demarches = response.getBody();
            if (demarches == null) {
                return new HashMap<>();
            }

            return demarches.stream()
                    .collect(Collectors.groupingBy(
                            d -> (String) d.get("typeDemarche"),
                            Collectors.counting()
                    ));
        } catch (RestClientException e) {
            log.error("Error fetching demarches by type", e);
            throw new ServiceUnavailableException("demarches-service", e);
        }
    }

    @Cacheable(value = "demarcheStats", key = "'evolution-' + #startDate + '-' + #endDate + '-' + #period")
    public EvolutionDTO getDemarchesEvolution(LocalDate startDate, LocalDate endDate, String period) {
        log.info("Fetching demarches evolution from {} to {} with period {}", startDate, endDate, period);
        try {
            String url = demarchesServiceUrl + "/demarches";
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );

            List<Map<String, Object>> demarches = response.getBody();
            if (demarches == null) {
                demarches = new ArrayList<>();
            }

            Map<String, Long> evolutionData = new HashMap<>();
            // Group by period (simplified - assumes all demarches for now)
            evolutionData.put(LocalDate.now().toString(), (long) demarches.size());

            EvolutionDTO evolution = new EvolutionDTO();
            evolution.setStartDate(startDate);
            evolution.setEndDate(endDate);
            evolution.setPeriod(period);
            evolution.setData(evolutionData);
            evolution.setMetric("demarches");

            return evolution;
        } catch (RestClientException e) {
            log.error("Error fetching demarches evolution", e);
            throw new ServiceUnavailableException("demarches-service", e);
        }
    }

    @Cacheable(value = "documentStats", key = "'all'")
    public DocumentStatsDTO getDocumentStats() {
        log.info("Fetching document statistics");
        DocumentStatsDTO stats = new DocumentStatsDTO();
        
        try {
            // For now, return mock data as document service endpoints are not specified
            stats.setTotalDocuments(0L);
            stats.setTotalSize(0L);
            stats.setByType(new HashMap<>());
            stats.setAverageSize(0.0);
            stats.setUploadsLastMonth(0L);
            stats.setMostCommonType("N/A");
            
            log.info("Document stats: {}", stats);
            return stats;
        } catch (Exception e) {
            log.error("Error fetching document statistics", e);
            throw new ServiceUnavailableException("document-service", e);
        }
    }

    @Cacheable(value = "userActivity", key = "'all'")
    public List<UserActivityDTO> getUsersActivity() {
        log.info("Fetching user activity statistics");
        try {
            String userUrl = userServiceUrl + "/users";
            ResponseEntity<List<Map<String, Object>>> userResponse = restTemplate.exchange(
                    userUrl,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );

            List<Map<String, Object>> users = userResponse.getBody();
            if (users == null) {
                return new ArrayList<>();
            }

            String demarchesUrl = demarchesServiceUrl + "/demarches";
            ResponseEntity<List<Map<String, Object>>> demarchesResponse = restTemplate.exchange(
                    demarchesUrl,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );

            List<Map<String, Object>> demarches = demarchesResponse.getBody();
            if (demarches == null) {
                demarches = new ArrayList<>();
            }

            List<UserActivityDTO> activities = new ArrayList<>();
            for (Map<String, Object> user : users) {
                UserActivityDTO activity = new UserActivityDTO();
                activity.setUserId(((Number) user.get("id")).longValue());
                activity.setUserName(user.get("nom") + " " + user.get("prenom"));
                activity.setUserEmail((String) user.get("email"));
                
                String userId = String.valueOf(user.get("id"));
                List<Map<String, Object>> userDemarches = demarches.stream()
                        .filter(d -> userId.equals(String.valueOf(d.get("userId"))))
                        .collect(Collectors.toList());
                
                activity.setTotalDemarches((long) userDemarches.size());
                activity.setActiveDemarches(userDemarches.stream()
                        .filter(d -> "EN_COURS".equals(d.get("statut")))
                        .count());
                activity.setCompletedDemarches(userDemarches.stream()
                        .filter(d -> "TERMINEE".equals(d.get("statut")))
                        .count());
                activity.setTotalDocuments(0L);
                activity.setLastActivityDate(LocalDateTime.now());
                activity.setActivityScore(calculateActivityScore(activity));
                
                activities.add(activity);
            }

            return activities;
        } catch (RestClientException e) {
            log.error("Error fetching user activity", e);
            throw new ServiceUnavailableException("user-service or demarches-service", e);
        }
    }

    @Cacheable(value = "dashboard", key = "'summary'")
    public DashboardSummaryDTO getDashboardSummary() {
        log.info("Fetching dashboard summary");
        try {
            DashboardSummaryDTO dashboard = new DashboardSummaryDTO();

            // Fetch users
            String userUrl = userServiceUrl + "/users";
            ResponseEntity<List<Map<String, Object>>> userResponse = restTemplate.exchange(
                    userUrl,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
            List<Map<String, Object>> users = userResponse.getBody();
            dashboard.setTotalUsers(users != null ? (long) users.size() : 0L);
            dashboard.setActiveUsers(users != null ? 
                    users.stream().filter(u -> Boolean.TRUE.equals(u.get("actif"))).count() : 0L);

            // Fetch demarches
            String demarchesUrl = demarchesServiceUrl + "/demarches";
            ResponseEntity<List<Map<String, Object>>> demarchesResponse = restTemplate.exchange(
                    demarchesUrl,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
            List<Map<String, Object>> demarches = demarchesResponse.getBody();
            dashboard.setTotalDemarches(demarches != null ? (long) demarches.size() : 0L);
            
            if (demarches != null) {
                dashboard.setActiveDemarches(demarches.stream()
                        .filter(d -> "EN_COURS".equals(d.get("statut")) || "EN_ATTENTE".equals(d.get("statut")))
                        .count());
                dashboard.setCompletedDemarches(demarches.stream()
                        .filter(d -> "TERMINEE".equals(d.get("statut")))
                        .count());
                
                // Calculate average progression
                double avgProgression = demarches.stream()
                        .mapToDouble(d -> {
                            Object prog = d.get("progression");
                            return prog != null ? ((Number) prog).doubleValue() : 0.0;
                        })
                        .average()
                        .orElse(0.0);
                dashboard.setAverageDemarcheProgression(avgProgression);
            } else {
                dashboard.setActiveDemarches(0L);
                dashboard.setCompletedDemarches(0L);
                dashboard.setAverageDemarcheProgression(0.0);
            }

            dashboard.setTotalDocuments(0L);
            dashboard.setDocumentsUploadedToday(0L);
            dashboard.setLastUpdate(LocalDateTime.now());

            return dashboard;
        } catch (RestClientException e) {
            log.error("Error fetching dashboard summary", e);
            throw new ServiceUnavailableException("multiple services", e);
        }
    }

    @Cacheable(value = "performance", key = "'metrics'")
    public PerformanceMetricsDTO getPerformanceMetrics() {
        log.info("Fetching performance metrics");
        PerformanceMetricsDTO metrics = new PerformanceMetricsDTO();
        
        // Mock performance metrics
        metrics.setAverageResponseTime(150.0);
        metrics.setTotalRequests(1000L);
        metrics.setSuccessfulRequests(980L);
        metrics.setFailedRequests(20L);
        metrics.setSuccessRate(98.0);
        metrics.setActiveConnections(5);
        metrics.setTimestamp(LocalDateTime.now());
        
        return metrics;
    }

    private Integer calculateActivityScore(UserActivityDTO activity) {
        int score = 0;
        score += activity.getTotalDemarches() * 10;
        score += activity.getCompletedDemarches() * 20;
        score += activity.getTotalDocuments() * 5;
        return score;
    }
}
