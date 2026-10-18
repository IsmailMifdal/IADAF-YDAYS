package com.iadaf.document.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** Contenu chiffré d'une pièce (AES-256-GCM, voir {@code DocumentCipher}). */
@Entity
@Table(name = "document_contents", schema = "documents")
@Getter
@Setter
@NoArgsConstructor
public class DocumentContent {

    @Id
    @Column(name = "document_id")
    private UUID documentId;

    @Column(nullable = false)
    private byte[] iv;

    @Column(nullable = false)
    private byte[] ciphertext;
}
