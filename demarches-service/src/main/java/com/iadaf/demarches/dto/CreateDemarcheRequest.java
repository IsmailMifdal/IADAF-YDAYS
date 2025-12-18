package com.iadaf.demarches.dto;

import com.iadaf.demarches.enums.PrioriteDemarche;
import com.iadaf.demarches.enums.StatutDemarche;
import com.iadaf.demarches.enums.TypeDemarche;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateDemarcheRequest {
    
    @NotBlank(message = "Le titre est obligatoire")
    @Size(max = 200, message = "Le titre ne peut pas dépasser 200 caractères")
    private String titre;
    
    private String description;
    
    @NotNull(message = "Le type de démarche est obligatoire")
    private TypeDemarche typeDemarche;
    
    private StatutDemarche statut;
    
    private PrioriteDemarche priorite;
    
    @Size(max = 100, message = "Le numéro de référence ne peut pas dépasser 100 caractères")
    private String numeroReference;
    
    @Size(max = 200, message = "L'organisme concerné ne peut pas dépasser 200 caractères")
    private String organismeConcerne;
    
    private LocalDate dateEcheance;
    
    private LocalDate dateDebut;
    
    private LocalDate dateFin;
    
    private String notes;
}
