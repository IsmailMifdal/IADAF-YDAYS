package com.iadaf.demarches.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommentaireDemarcheDTO {
    private Long id;
    private String contenu;
    private String userId;
    private LocalDateTime dateCreation;
    private LocalDateTime dateModification;
}
