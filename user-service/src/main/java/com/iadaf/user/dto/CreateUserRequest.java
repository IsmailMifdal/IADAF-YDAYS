package com.iadaf.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserRequest {

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 100, message = "Le nom ne peut pas dépasser 100 caractères")
    private String nom;

    @NotBlank(message = "Le prénom est obligatoire")
    @Size(max = 100, message = "Le prénom ne peut pas dépasser 100 caractères")
    private String prenom;

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "L'email doit être valide")
    private String email;

    @Size(max = 20, message = "Le téléphone ne peut pas dépasser 20 caractères")
    private String telephone;

    @Size(max = 10, message = "La langue préférée ne peut pas dépasser 10 caractères")
    private String languePreferee;

    @Size(max = 10, message = "Le niveau de français ne peut pas dépasser 10 caractères")
    private String niveauFrancais;

    @Size(max = 100, message = "Le pays d'origine ne peut pas dépasser 100 caractères")
    private String paysOrigine;

    @Size(max = 100, message = "La ville de résidence ne peut pas dépasser 100 caractères")
    private String villeResidence;

    @Size(max = 50, message = "Le statut actuel ne peut pas dépasser 50 caractères")
    private String statutActuel;

    private String notes;
}
