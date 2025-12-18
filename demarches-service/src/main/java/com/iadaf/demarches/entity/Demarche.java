package com.iadaf.demarches.entity;

import com.iadaf.demarches.enums.PrioriteDemarche;
import com.iadaf.demarches.enums.StatutDemarche;
import com.iadaf.demarches.enums.TypeDemarche;
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
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "demarches", schema = "demarches")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Demarche {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Le titre est obligatoire")
    @Size(max = 200, message = "Le titre ne peut pas dépasser 200 caractères")
    @Column(nullable = false, length = 200)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String description;

    @NotNull(message = "Le type de démarche est obligatoire")
    @Enumerated(EnumType.STRING)
    @Column(name = "type_demarche", nullable = false, length = 50)
    private TypeDemarche typeDemarche;

    @NotNull(message = "Le statut est obligatoire")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StatutDemarche statut = StatutDemarche.EN_ATTENTE;

    @NotNull(message = "La priorité est obligatoire")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PrioriteDemarche priorite = PrioriteDemarche.MOYENNE;

    @NotNull(message = "L'ID utilisateur est obligatoire")
    @Column(name = "user_id", nullable = false)
    private String userId;

    @Size(max = 100, message = "Le numéro de référence ne peut pas dépasser 100 caractères")
    @Column(name = "numero_reference", length = 100)
    private String numeroReference;

    @Size(max = 200, message = "L'organisme concerné ne peut pas dépasser 200 caractères")
    @Column(name = "organisme_concerne", length = 200)
    private String organismeConcerne;

    @Column(name = "date_echeance")
    private LocalDate dateEcheance;

    @Column(name = "date_debut")
    private LocalDate dateDebut;

    @Column(name = "date_fin")
    private LocalDate dateFin;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @UpdateTimestamp
    @Column(name = "date_modification")
    private LocalDateTime dateModification;

    @OneToMany(mappedBy = "demarche", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EtapeDemarche> etapes = new ArrayList<>();

    @OneToMany(mappedBy = "demarche", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CommentaireDemarche> commentaires = new ArrayList<>();

    @Transient
    public Double getProgression() {
        if (etapes == null || etapes.isEmpty()) {
            return 0.0;
        }
        long completedSteps = etapes.stream().filter(EtapeDemarche::getCompletee).count();
        return (completedSteps * 100.0) / etapes.size();
    }
}
