package com.iadaf.demarches.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EtapeDemarcheDTO {
    private Long id;
    private String titre;
    private String description;
    private Integer ordre;
    private Boolean completee;
    private LocalDate dateCompletion;
    private LocalDateTime dateCreation;
    private LocalDateTime dateModification;
}
