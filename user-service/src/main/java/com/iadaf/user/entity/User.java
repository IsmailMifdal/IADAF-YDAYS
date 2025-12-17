package com.iadaf.user.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users", schema = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 100, message = "Le nom ne peut pas dépasser 100 caractères")
    @Column(nullable = false, length = 100)
    private String nom;

    @NotBlank(message = "Le prénom est obligatoire")
    @Size(max = 100, message = "Le prénom ne peut pas dépasser 100 caractères")
    @Column(nullable = false, length = 100)
    private String prenom;

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "L'email doit être valide")
    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Size(max = 20, message = "Le téléphone ne peut pas dépasser 20 caractères")
    @Column(length = 20)
    private String telephone;

    @Size(max = 10, message = "La langue préférée ne peut pas dépasser 10 caractères")
    @Column(name = "langue_preferee", length = 10)
    private String languePreferee;

    @Size(max = 10, message = "Le niveau de français ne peut pas dépasser 10 caractères")
    @Column(name = "niveau_francais", length = 10)
    private String niveauFrancais;

    @Size(max = 100, message = "Le pays d'origine ne peut pas dépasser 100 caractères")
    @Column(name = "pays_origine", length = 100)
    private String paysOrigine;

    @Size(max = 100, message = "La ville de résidence ne peut pas dépasser 100 caractères")
    @Column(name = "ville_residence", length = 100)
    private String villeResidence;

    @Size(max = 50, message = "Le statut actuel ne peut pas dépasser 50 caractères")
    @Column(name = "statut_actuel", length = 50)
    private String statutActuel;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    private Boolean actif = true;

    @CreationTimestamp
    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @UpdateTimestamp
    @Column(name = "date_modification")
    private LocalDateTime dateModification;
}
