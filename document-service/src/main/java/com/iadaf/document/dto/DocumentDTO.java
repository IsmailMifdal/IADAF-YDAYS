package com.iadaf.document.dto;

import com.iadaf.document.entity.StoredDocument;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Ce que l'API expose d'une pièce : jamais son contenu ni son empreinte. */
public record DocumentDTO(
        UUID id,
        String packSlug,
        String documentType,
        String originalFilename,
        String contentType,
        int sizeBytes,
        OffsetDateTime createdAt) {

    public static DocumentDTO of(StoredDocument d) {
        return new DocumentDTO(d.getId(), d.getPackSlug(), d.getDocumentType(),
                d.getOriginalFilename(), d.getContentType(), d.getSizeBytes(), d.getCreatedAt());
    }
}
