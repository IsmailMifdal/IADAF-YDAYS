package com.iadaf.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DemarcheStatsDTO {
    private Long totalDemarches;
    private Map<String, Long> byStatut;
    private Map<String, Long> byType;
    private Map<String, Long> byPriorite;
    private Double averageProgression;
    private Long activeDemarches;
    private Long completedDemarches;
}
