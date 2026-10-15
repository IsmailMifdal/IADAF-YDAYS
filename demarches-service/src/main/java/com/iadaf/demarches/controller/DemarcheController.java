package com.iadaf.demarches.controller;

import com.iadaf.demarches.dto.CreateDemarcheRequest;
import com.iadaf.demarches.dto.DemarcheDTO;
import com.iadaf.demarches.dto.EnsurePackFolderRequest;
import com.iadaf.demarches.dto.UpdateDemarcheRequest;
import com.iadaf.demarches.dto.UpdateStatutRequest;
import com.iadaf.demarches.enums.StatutDemarche;
import com.iadaf.demarches.enums.TypeDemarche;
import com.iadaf.demarches.service.DemarcheService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@org.springframework.validation.annotation.Validated
@RequestMapping("/demarches")
@RequiredArgsConstructor
@Slf4j
public class DemarcheController {

    private final DemarcheService demarcheService;

    /**
     * Efface toutes les démarches du compte du jeton. Exige le scope
     * {@code account:erase}, que le frontend ne pose qu'à la suppression du
     * compte, jamais sur un appel relayé depuis le navigateur.
     */
    @DeleteMapping("/me")
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('SCOPE_account:erase')")
    public ResponseEntity<java.util.Map<String, Integer>> eraseMyData() {
        return ResponseEntity.ok(java.util.Map.of("deletedDemarches", demarcheService.eraseCurrentUserData()));
    }

    /** Dossier de suivi d'un pack acheté — créé au premier appel, renvoyé ensuite. */
    @PutMapping("/packs/{packSlug}")
    public ResponseEntity<DemarcheDTO> ensurePackFolder(
            @PathVariable @Pattern(regexp = "[a-z0-9-]{1,64}") String packSlug,
            @Valid @RequestBody EnsurePackFolderRequest request) {
        return ResponseEntity.ok(demarcheService.ensurePackFolder(packSlug, request));
    }

    @PostMapping
    public ResponseEntity<DemarcheDTO> createDemarche(@Valid @RequestBody CreateDemarcheRequest request) {
        log.info("REST request to create Demarche");
        DemarcheDTO createdDemarche = demarcheService.createDemarche(request);
        return new ResponseEntity<>(createdDemarche, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<DemarcheDTO>> getAllDemarches() {
        log.info("REST request to get all Demarches");
        List<DemarcheDTO> demarches = demarcheService.getAllDemarches();
        return ResponseEntity.ok(demarches);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DemarcheDTO> getDemarcheById(@PathVariable Long id) {
        log.info("REST request to get Demarche by id: {}", id);
        DemarcheDTO demarche = demarcheService.getDemarcheById(id);
        return ResponseEntity.ok(demarche);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DemarcheDTO> updateDemarche(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDemarcheRequest request) {
        log.info("REST request to update Demarche with id: {}", id);
        DemarcheDTO updatedDemarche = demarcheService.updateDemarche(id, request);
        return ResponseEntity.ok(updatedDemarche);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDemarche(@PathVariable Long id) {
        log.info("REST request to delete Demarche with id: {}", id);
        demarcheService.deleteDemarche(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/statut/{statut}")
    public ResponseEntity<List<DemarcheDTO>> getDemarchesByStatut(@PathVariable StatutDemarche statut) {
        log.info("REST request to get Demarches by statut: {}", statut);
        List<DemarcheDTO> demarches = demarcheService.getDemarchesByStatut(statut);
        return ResponseEntity.ok(demarches);
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<DemarcheDTO>> getDemarchesByType(@PathVariable TypeDemarche type) {
        log.info("REST request to get Demarches by type: {}", type);
        List<DemarcheDTO> demarches = demarcheService.getDemarchesByType(type);
        return ResponseEntity.ok(demarches);
    }

    @PatchMapping("/{id}/statut")
    public ResponseEntity<DemarcheDTO> updateStatut(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStatutRequest request) {
        log.info("REST request to update statut for Demarche with id: {}", id);
        DemarcheDTO updatedDemarche = demarcheService.updateStatut(id, request);
        return ResponseEntity.ok(updatedDemarche);
    }

    @GetMapping("/retard")
    public ResponseEntity<List<DemarcheDTO>> getOverdueDemarches() {
        log.info("REST request to get overdue Demarches");
        List<DemarcheDTO> demarches = demarcheService.getOverdueDemarches();
        return ResponseEntity.ok(demarches);
    }
}
