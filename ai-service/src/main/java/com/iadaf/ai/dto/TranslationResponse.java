package com.iadaf.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TranslationResponse {

    private String translatedText;
    
    private String sourceLanguage;
    
    private String targetLanguage;
}
