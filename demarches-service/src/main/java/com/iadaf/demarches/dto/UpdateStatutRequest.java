package com.iadaf.demarches.dto;

import com.iadaf.demarches.enums.StatutDemarche;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStatutRequest {
    
    @NotNull(message = "Le statut est obligatoire")
    private StatutDemarche statut;
}
