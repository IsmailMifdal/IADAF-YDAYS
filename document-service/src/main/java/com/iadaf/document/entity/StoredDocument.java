package com.iadaf.document.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Métadonnées d'une pièce déposée. Le contenu chiffré vit dans {@link DocumentContent}. */
@Entity
@Table(name = "documents", schema = "documents")
@Getter
@Setter
@NoArgsConstructor
public class StoredDocument {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false, length = 64)
    private String userId;

    @Column(name = "pack_slug", nullable = false, length = 64)
    private String packSlug;

    @Column(name = "document_type", nullable = false, length = 200)
    private String documentType;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private int sizeBytes;

    @Column(nullable = false, length = 64)
    private String sha256;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
