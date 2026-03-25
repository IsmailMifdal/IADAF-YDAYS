package com.iadaf.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentStatsDTO {
    private Long totalDocuments;
    private Long totalSize;
    private Map<String, Long> byType;
    private Double averageSize;
    private Long uploadsLastMonth;
    private String mostCommonType;
}
