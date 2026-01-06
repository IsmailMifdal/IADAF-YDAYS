package com.iadaf.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TranslationRequest {

    @NotBlank(message = "Le texte ne peut pas être vide")
    private String text;

    @NotBlank(message = "La langue cible est obligatoire")
    private String targetLanguage; // FR, EN, AR, ES

    private String sourceLanguage; // Optional, auto-detect if not provided
}
