package com.iadaf.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryDTO {
    private Long totalUsers;
    private Long activeUsers;
    private Long totalDemarches;
    private Long activeDemarches;
    private Long completedDemarches;
    private Long totalDocuments;
    private Long documentsUploadedToday;
    private Double averageDemarcheProgression;
    private LocalDateTime lastUpdate;
}
