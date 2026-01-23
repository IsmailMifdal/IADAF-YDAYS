package com.iadaf.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SuggestionDTO {

    private String demarcheId;
    
    private String demarcheTitle;
    
    private String description;
    
    private String reason; // Why this is suggested for the user
    
    private List<String> steps; // Step-by-step guide
    
    private Integer priority; // 1 (high) to 5 (low)
    
    private String difficulty; // "facile", "moyen", "difficile"
}
