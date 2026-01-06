package com.iadaf.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentAnalysisRequest {

    @NotBlank(message = "Le contenu du document ne peut pas être vide")
    private String documentContent;

    private String documentType; // Optional: "carte_identite", "justificatif_domicile", etc.

    private String language; // Optional: FR, EN, AR, ES
}
