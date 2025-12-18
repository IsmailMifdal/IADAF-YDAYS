package com.iadaf.demarches.dto;

import com.iadaf.demarches.enums.PrioriteDemarche;
import com.iadaf.demarches.enums.StatutDemarche;
import com.iadaf.demarches.enums.TypeDemarche;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DemarcheDTO {
    private Long id;
    private String titre;
    private String description;
    private TypeDemarche typeDemarche;
    private StatutDemarche statut;
    private PrioriteDemarche priorite;
    private String userId;
    private String numeroReference;
    private String organismeConcerne;
    private LocalDate dateEcheance;
    private LocalDate dateDebut;
    private LocalDate dateFin;
    private String notes;
    private Boolean active;
    private LocalDateTime dateCreation;
    private LocalDateTime dateModification;
    private Double progression;
    private List<EtapeDemarcheDTO> etapes;
    private List<CommentaireDemarcheDTO> commentaires;
}
