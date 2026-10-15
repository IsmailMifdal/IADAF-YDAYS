package com.iadaf.document.controller;

import com.iadaf.document.dto.DocumentDTO;
import com.iadaf.document.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService service;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentDTO> upload(@RequestParam String packSlug,
                                              @RequestParam String documentType,
                                              @RequestPart MultipartFile file) throws IOException {
        DocumentDTO stored = service.upload(packSlug, documentType, file.getOriginalFilename(), file.getBytes());
        return ResponseEntity.status(HttpStatus.CREATED).body(stored);
    }

    @GetMapping
    public List<DocumentDTO> list(@RequestParam String packSlug) {
        return service.list(packSlug);
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<byte[]> download(@PathVariable UUID id) {
        DocumentService.Download download = service.download(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(download.document().contentType()))
                // Toujours en pièce jointe, jamais affiché en ligne : un fichier
                // déposé ne s'exécute pas dans l'origine du site.
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(download.document().originalFilename(), StandardCharsets.UTF_8)
                        .build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(download.content());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Efface toutes les pièces du compte du jeton. Exige le scope
     * {@code account:erase}, posé par le frontend à la seule suppression du compte.
     */
    @DeleteMapping("/me")
    @PreAuthorize("hasAuthority('SCOPE_account:erase')")
    public Map<String, Integer> eraseMyData() {
        return Map.of("deletedDocuments", service.eraseCurrentUserData());
    }
}
