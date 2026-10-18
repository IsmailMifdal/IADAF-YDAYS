package com.iadaf.demarches.dto;

import com.iadaf.demarches.enums.TypeDemarche;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Dossier de suivi d'un pack acheté, créé par le frontend.
 *
 * <p>Les étapes sont les pièces à réunir ; la progression du dossier est la part
 * d'étapes complétées.
 */
@Data
public class EnsurePackFolderRequest {

    @NotBlank
    @Size(max = 200)
    private String titre;

    @NotNull
    private TypeDemarche typeDemarche;

    @Size(max = 200)
    private String organismeConcerne;

    @Size(max = 50)
    private List<@NotBlank @Size(max = 200) String> etapes = new ArrayList<>();
}
