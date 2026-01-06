package com.iadaf.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EvolutionDTO {
    private LocalDate startDate;
    private LocalDate endDate;
    private String period; // DAILY, WEEKLY, MONTHLY
    private Map<String, Long> data;
    private String metric; // demarches, documents, users
}
