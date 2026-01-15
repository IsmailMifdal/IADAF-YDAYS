package com.iadaf.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnalysisResult {

    private String documentType;
    
    private Map<String, String> extractedInfo; // Key-value pairs (name, address, date, etc.)
    
    private String summary;
    
    private List<String> suggestedActions; // Recommended next steps
    
    private Double confidence; // 0.0 to 1.0
}
