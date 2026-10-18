package com.iadaf.demarches.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Pièce d'un dossier de pack réunie (ou retirée). */
@Data
public class UpdatePackStepRequest {

    /** Intitulé de l'étape, tel que créé avec le dossier (« Passeport », « RIB »…). */
    @NotBlank
    @Size(max = 200)
    private String titre;

    @NotNull
    private Boolean completee;
}
