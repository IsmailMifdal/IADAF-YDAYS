package com.iadaf.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceMetricsDTO {
    private Double averageResponseTime;
    private Long totalRequests;
    private Long successfulRequests;
    private Long failedRequests;
    private Double successRate;
    private Integer activeConnections;
    private LocalDateTime timestamp;
}
