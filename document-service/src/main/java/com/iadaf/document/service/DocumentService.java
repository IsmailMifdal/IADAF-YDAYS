package com.iadaf.document.service;

import com.iadaf.document.dto.DocumentDTO;
import com.iadaf.document.entity.DocumentContent;
import com.iadaf.document.entity.StoredDocument;
import com.iadaf.document.repository.DocumentContentRepository;
import com.iadaf.document.repository.DocumentRepository;
import com.iadaf.document.storage.DocumentCipher;
import com.iadaf.document.storage.FileTypes;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Pièces des dossiers, chiffrées au repos et cloisonnées par utilisateur.
 *
 * <p>L'identité est le sujet du jeton interne vérifié : un utilisateur ne voit,
 * ne lit et ne supprime que ses propres pièces. Le droit d'accès au pack est
 * vérifié en amont par le frontend, frontière de confiance.
 */
@Slf4j
@Service
@Transactional
public class DocumentService {

    public static final int MAX_BYTES = 10 * 1024 * 1024;
    private static final Pattern PACK_SLUG = Pattern.compile("[a-z0-9-]{1,64}");

    private final DocumentRepository documents;
    private final DocumentContentRepository contents;
    private final DocumentCipher cipher;
    private final int retentionDays;

    public DocumentService(DocumentRepository documents,
                           DocumentContentRepository contents,
                           DocumentCipher cipher,
                           @Value("${iadaf.documents.retention-days:180}") int retentionDays) {
        this.documents = documents;
        this.contents = contents;
        this.cipher = cipher;
        this.retentionDays = retentionDays;
    }

    public DocumentDTO upload(String packSlug, String documentType, String filename, byte[] content) {
        String userId = currentUserId();
        if (packSlug == null || !PACK_SLUG.matcher(packSlug).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pack invalide");
        }
        if (documentType == null || documentType.isBlank() || documentType.length() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type de pièce invalide");
        }
        if (content.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fichier vide");
        }
        if (content.length > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Fichier trop volumineux");
        }
        String contentType = FileTypes.detect(content).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Formats acceptés : PDF, JPEG, PNG"));

        // Une pièce par emplacement : un nouveau dépôt remplace l'ancien, et
        // l'ancien fichier disparaît avec lui (contenu en cascade).
        documents.findByUserIdAndPackSlugAndDocumentType(userId, packSlug, documentType)
                .ifPresent(previous -> {
                    documents.delete(previous);
                    documents.flush();
                });

        StoredDocument document = new StoredDocument();
        document.setId(UUID.randomUUID());
        document.setUserId(userId);
        document.setPackSlug(packSlug);
        document.setDocumentType(documentType.trim());
        document.setOriginalFilename(safeFilename(filename, contentType));
        document.setContentType(contentType);
        document.setSizeBytes(content.length);
        document.setSha256(sha256(content));
        document.setCreatedAt(OffsetDateTime.now());
        documents.saveAndFlush(document);

        DocumentCipher.Encrypted encrypted = cipher.encrypt(document.getId(), content);
        DocumentContent stored = new DocumentContent();
        stored.setDocumentId(document.getId());
        stored.setIv(encrypted.iv());
        stored.setCiphertext(encrypted.ciphertext());
        contents.save(stored);

        log.info("Pièce déposée ({} octets, {}) pour le pack {}", content.length, contentType, packSlug);
        return DocumentDTO.of(document);
    }

    @Transactional(readOnly = true)
    public List<DocumentDTO> list(String packSlug) {
        return documents.findByUserIdAndPackSlugOrderByCreatedAtAsc(currentUserId(), packSlug)
                .stream().map(DocumentDTO::of).toList();
    }

    /** Contenu déchiffré, vérifié contre l'empreinte enregistrée au dépôt. */
    @Transactional(readOnly = true)
    public Download download(UUID id) {
        StoredDocument document = owned(id);
        DocumentContent stored = contents.findById(id).orElseThrow(DocumentService::notFound);
        byte[] content = cipher.decrypt(id, stored.getIv(), stored.getCiphertext());
        if (!sha256(content).equals(document.getSha256())) {
            throw new IllegalStateException("Empreinte divergente pour la pièce " + id);
        }
        return new Download(DocumentDTO.of(document), content);
    }

    public void delete(UUID id) {
        documents.delete(owned(id));
    }

    /** Droit à l'effacement : toutes les pièces du compte du jeton. */
    public int eraseCurrentUserData() {
        int deleted = documents.deleteAllByUserId(currentUserId());
        log.info("Effacement de {} pièce(s) pour un compte supprimé", deleted);
        return deleted;
    }

    /** Durée de conservation (RGPD) : chaque nuit, les pièces trop anciennes sont effacées. */
    @Scheduled(cron = "0 30 3 * * *")
    public void purgeExpired() {
        int deleted = documents.deleteCreatedBefore(OffsetDateTime.now().minusDays(retentionDays));
        if (deleted > 0) {
            log.info("Purge : {} pièce(s) de plus de {} jours effacée(s)", deleted, retentionDays);
        }
    }

    private StoredDocument owned(UUID id) {
        // Une pièce d'un autre utilisateur répond comme une pièce inexistante :
        // rien ne révèle qu'elle existe.
        return documents.findByIdAndUserId(id, currentUserId()).orElseThrow(DocumentService::notFound);
    }

    private static String currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt
                && jwt.getSubject() != null && !jwt.getSubject().isBlank()) {
            return jwt.getSubject();
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Utilisateur connecté requis");
    }

    /** Nom affichable : sans chemin ni caractères de contrôle, extension cohérente avec le type réel. */
    static String safeFilename(String filename, String contentType) {
        String name = filename == null ? "" : filename;
        name = name.replaceAll("^.*[/\\\\]", "").replaceAll("[\\p{Cntrl}\"<>]", "").trim();
        if (name.isEmpty()) {
            name = "piece";
        }
        if (name.length() > 200) {
            name = name.substring(0, 200);
        }
        String extension = switch (contentType) {
            case "application/pdf" -> ".pdf";
            case "image/jpeg" -> ".jpg";
            default -> ".png";
        };
        String lower = name.toLowerCase();
        boolean matches = lower.endsWith(extension) || (extension.equals(".jpg") && lower.endsWith(".jpeg"));
        return matches ? name : name + extension;
    }

    private static String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Pièce introuvable");
    }

    public record Download(DocumentDTO document, byte[] content) {
    }
}
