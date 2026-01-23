package com.iadaf.demarches.service;

import com.iadaf.demarches.dto.CreateDemarcheRequest;
import com.iadaf.demarches.dto.DemarcheDTO;
import com.iadaf.demarches.dto.UpdateDemarcheRequest;
import com.iadaf.demarches.dto.UpdateStatutRequest;
import com.iadaf.demarches.entity.Demarche;
import com.iadaf.demarches.enums.StatutDemarche;
import com.iadaf.demarches.enums.TypeDemarche;
import com.iadaf.demarches.exception.ResourceNotFoundException;
import com.iadaf.demarches.exception.UnauthorizedAccessException;
import com.iadaf.demarches.mapper.DemarcheMapper;
import com.iadaf.demarches.repository.DemarcheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DemarcheService {

    private final DemarcheRepository demarcheRepository;
    private final DemarcheMapper demarcheMapper;

    private String getUserIdFromToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getSubject();
            log.debug("Extracted userId from JWT: {}", userId);
            return userId;
        }
        throw new UnauthorizedAccessException("Impossible d'extraire l'ID utilisateur du token JWT");
    }

    public DemarcheDTO createDemarche(CreateDemarcheRequest request) {
        String userId = getUserIdFromToken();
        log.info("Création d'une nouvelle démarche pour l'utilisateur: {}", userId);
        
        Demarche demarche = demarcheMapper.toEntity(request, userId);
        Demarche savedDemarche = demarcheRepository.save(demarche);
        
        log.info("Démarche créée avec succès avec ID: {}", savedDemarche.getId());
        return demarcheMapper.toDTO(savedDemarche);
    }

    @Transactional(readOnly = true)
    public List<DemarcheDTO> getAllDemarches() {
        String userId = getUserIdFromToken();
        log.info("Récupération de toutes les démarches pour l'utilisateur: {}", userId);
        
        return demarcheRepository.findByUserIdAndActiveTrue(userId)
                .stream()
                .map(demarcheMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DemarcheDTO getDemarcheById(Long id) {
        String userId = getUserIdFromToken();
        log.info("Récupération de la démarche avec ID: {} pour l'utilisateur: {}", id, userId);
        
        Demarche demarche = demarcheRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Démarche", "id", id));
        
        return demarcheMapper.toDTO(demarche);
    }

    public DemarcheDTO updateDemarche(Long id, UpdateDemarcheRequest request) {
        String userId = getUserIdFromToken();
        log.info("Mise à jour de la démarche avec ID: {} pour l'utilisateur: {}", id, userId);
        
        Demarche demarche = demarcheRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Démarche", "id", id));
        
        demarcheMapper.updateEntity(demarche, request);
        Demarche updatedDemarche = demarcheRepository.save(demarche);
        
        log.info("Démarche mise à jour avec succès avec ID: {}", updatedDemarche.getId());
        return demarcheMapper.toDTO(updatedDemarche);
    }

    public void deleteDemarche(Long id) {
        String userId = getUserIdFromToken();
        log.info("Suppression (soft delete) de la démarche avec ID: {} pour l'utilisateur: {}", id, userId);
        
        Demarche demarche = demarcheRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Démarche", "id", id));
        
        demarche.setActive(false);
        demarcheRepository.save(demarche);
        
        log.info("Démarche supprimée avec succès avec ID: {}", id);
    }

    @Transactional(readOnly = true)
    public List<DemarcheDTO> getDemarchesByStatut(StatutDemarche statut) {
        String userId = getUserIdFromToken();
        log.info("Récupération des démarches par statut: {} pour l'utilisateur: {}", statut, userId);
        
        return demarcheRepository.findByUserIdAndStatutAndActiveTrue(userId, statut)
                .stream()
                .map(demarcheMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DemarcheDTO> getDemarchesByType(TypeDemarche type) {
        String userId = getUserIdFromToken();
        log.info("Récupération des démarches par type: {} pour l'utilisateur: {}", type, userId);
        
        return demarcheRepository.findByUserIdAndTypeDemarcheAndActiveTrue(userId, type)
                .stream()
                .map(demarcheMapper::toDTO)
                .collect(Collectors.toList());
    }

    public DemarcheDTO updateStatut(Long id, UpdateStatutRequest request) {
        String userId = getUserIdFromToken();
        log.info("Mise à jour du statut de la démarche avec ID: {} pour l'utilisateur: {}", id, userId);
        
        Demarche demarche = demarcheRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Démarche", "id", id));
        
        demarche.setStatut(request.getStatut());
        
        if (request.getStatut() == StatutDemarche.TERMINEE && demarche.getDateFin() == null) {
            demarche.setDateFin(LocalDate.now());
        }
        
        Demarche updatedDemarche = demarcheRepository.save(demarche);
        
        log.info("Statut de la démarche mis à jour avec succès avec ID: {}", updatedDemarche.getId());
        return demarcheMapper.toDTO(updatedDemarche);
    }

    @Transactional(readOnly = true)
    public List<DemarcheDTO> getOverdueDemarches() {
        String userId = getUserIdFromToken();
        log.info("Récupération des démarches en retard pour l'utilisateur: {}", userId);
        
        LocalDate today = LocalDate.now();
        return demarcheRepository.findOverdueDemarches(userId, today)
                .stream()
                .map(demarcheMapper::toDTO)
                .collect(Collectors.toList());
    }
}
