package com.iadaf.demarches.mapper;

import com.iadaf.demarches.dto.*;
import com.iadaf.demarches.entity.CommentaireDemarche;
import com.iadaf.demarches.entity.Demarche;
import com.iadaf.demarches.entity.EtapeDemarche;
import com.iadaf.demarches.enums.PrioriteDemarche;
import com.iadaf.demarches.enums.StatutDemarche;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class DemarcheMapper {

    public DemarcheDTO toDTO(Demarche demarche) {
        if (demarche == null) {
            return null;
        }
        
        DemarcheDTO dto = new DemarcheDTO();
        dto.setId(demarche.getId());
        dto.setTitre(demarche.getTitre());
        dto.setDescription(demarche.getDescription());
        dto.setTypeDemarche(demarche.getTypeDemarche());
        dto.setStatut(demarche.getStatut());
        dto.setPriorite(demarche.getPriorite());
        dto.setUserId(demarche.getUserId());
        dto.setNumeroReference(demarche.getNumeroReference());
        dto.setOrganismeConcerne(demarche.getOrganismeConcerne());
        dto.setDateEcheance(demarche.getDateEcheance());
        dto.setDateDebut(demarche.getDateDebut());
        dto.setDateFin(demarche.getDateFin());
        dto.setNotes(demarche.getNotes());
        dto.setActive(demarche.getActive());
        dto.setDateCreation(demarche.getDateCreation());
        dto.setDateModification(demarche.getDateModification());
        dto.setProgression(demarche.getProgression());
        
        if (demarche.getEtapes() != null) {
            dto.setEtapes(demarche.getEtapes().stream()
                    .map(this::toEtapeDTO)
                    .collect(Collectors.toList()));
        }
        
        if (demarche.getCommentaires() != null) {
            dto.setCommentaires(demarche.getCommentaires().stream()
                    .map(this::toCommentaireDTO)
                    .collect(Collectors.toList()));
        }
        
        return dto;
    }

    public Demarche toEntity(CreateDemarcheRequest request, String userId) {
        if (request == null) {
            return null;
        }
        
        Demarche demarche = new Demarche();
        demarche.setTitre(request.getTitre());
        demarche.setDescription(request.getDescription());
        demarche.setTypeDemarche(request.getTypeDemarche());
        demarche.setStatut(request.getStatut() != null ? request.getStatut() : StatutDemarche.EN_ATTENTE);
        demarche.setPriorite(request.getPriorite() != null ? request.getPriorite() : PrioriteDemarche.MOYENNE);
        demarche.setUserId(userId);
        demarche.setNumeroReference(request.getNumeroReference());
        demarche.setOrganismeConcerne(request.getOrganismeConcerne());
        demarche.setDateEcheance(request.getDateEcheance());
        demarche.setDateDebut(request.getDateDebut());
        demarche.setDateFin(request.getDateFin());
        demarche.setNotes(request.getNotes());
        demarche.setActive(true);
        
        return demarche;
    }

    public void updateEntity(Demarche demarche, UpdateDemarcheRequest request) {
        if (demarche == null || request == null) {
            return;
        }
        
        demarche.setTitre(request.getTitre());
        demarche.setDescription(request.getDescription());
        demarche.setTypeDemarche(request.getTypeDemarche());
        demarche.setStatut(request.getStatut());
        demarche.setPriorite(request.getPriorite());
        demarche.setNumeroReference(request.getNumeroReference());
        demarche.setOrganismeConcerne(request.getOrganismeConcerne());
        demarche.setDateEcheance(request.getDateEcheance());
        demarche.setDateDebut(request.getDateDebut());
        demarche.setDateFin(request.getDateFin());
        demarche.setNotes(request.getNotes());
    }

    public EtapeDemarcheDTO toEtapeDTO(EtapeDemarche etape) {
        if (etape == null) {
            return null;
        }
        
        EtapeDemarcheDTO dto = new EtapeDemarcheDTO();
        dto.setId(etape.getId());
        dto.setTitre(etape.getTitre());
        dto.setDescription(etape.getDescription());
        dto.setOrdre(etape.getOrdre());
        dto.setCompletee(etape.getCompletee());
        dto.setDateCompletion(etape.getDateCompletion());
        dto.setDateCreation(etape.getDateCreation());
        dto.setDateModification(etape.getDateModification());
        
        return dto;
    }

    public CommentaireDemarcheDTO toCommentaireDTO(CommentaireDemarche commentaire) {
        if (commentaire == null) {
            return null;
        }
        
        CommentaireDemarcheDTO dto = new CommentaireDemarcheDTO();
        dto.setId(commentaire.getId());
        dto.setContenu(commentaire.getContenu());
        dto.setUserId(commentaire.getUserId());
        dto.setDateCreation(commentaire.getDateCreation());
        dto.setDateModification(commentaire.getDateModification());
        
        return dto;
    }
}
