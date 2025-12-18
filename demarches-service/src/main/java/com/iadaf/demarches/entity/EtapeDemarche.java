package com.iadaf.demarches.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "etapes_demarche", schema = "demarches")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EtapeDemarche {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Le titre de l'étape est obligatoire")
    @Size(max = 200, message = "Le titre ne peut pas dépasser 200 caractères")
    @Column(nullable = false, length = 200)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String description;

    @NotNull(message = "L'ordre est obligatoire")
    @Column(nullable = false)
    private Integer ordre;

    @Column(nullable = false)
    private Boolean completee = false;

    @Column(name = "date_completion")
    private LocalDate dateCompletion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "demarche_id", nullable = false)
    private Demarche demarche;

    @CreationTimestamp
    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @UpdateTimestamp
    @Column(name = "date_modification")
    private LocalDateTime dateModification;
}
