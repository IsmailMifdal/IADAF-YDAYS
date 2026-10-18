package com.iadaf.document.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;

/**
 * Chiffrement des pièces au repos : AES-256-GCM, une clé de service
 * ({@code DOCUMENT_ENCRYPTION_KEY}), un vecteur d'initialisation aléatoire par
 * fichier.
 *
 * <p>L'identifiant du document est lié au chiffré comme donnée authentifiée
 * (AAD) : un contenu recopié sous une autre ligne — la pièce d'un autre
 * utilisateur, par exemple — échoue au déchiffrement au lieu d'être servi.
 * GCM détecte de même toute altération du chiffré.
 */
@Component
public class DocumentCipher {

    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecretKey key;
    private final SecureRandom random = new SecureRandom();

    public DocumentCipher(@Value("${iadaf.documents.encryption-key:}") String base64Key) {
        byte[] raw;
        try {
            raw = Base64.getDecoder().decode(base64Key.trim());
        } catch (IllegalArgumentException e) {
            raw = new byte[0];
        }
        if (raw.length != 32) {
            // Refuser de démarrer plutôt que de stocker des pièces d'identité
            // en clair ou avec une clé faible.
            throw new IllegalStateException(
                    "DOCUMENT_ENCRYPTION_KEY manquante ou invalide : 32 octets en base64 attendus");
        }
        this.key = new SecretKeySpec(raw, "AES");
    }

    public Encrypted encrypt(UUID documentId, byte[] plaintext) {
        byte[] iv = new byte[IV_BYTES];
        random.nextBytes(iv);
        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            cipher.updateAAD(aad(documentId));
            return new Encrypted(iv, cipher.doFinal(plaintext));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Chiffrement impossible", e);
        }
    }

    public byte[] decrypt(UUID documentId, byte[] iv, byte[] ciphertext) {
        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            cipher.updateAAD(aad(documentId));
            return cipher.doFinal(ciphertext);
        } catch (GeneralSecurityException e) {
            // Mauvaise clé, chiffré altéré ou contenu déplacé d'une autre ligne.
            throw new IllegalStateException("Déchiffrement impossible : contenu altéré", e);
        }
    }

    private static byte[] aad(UUID documentId) {
        return documentId.toString().getBytes(StandardCharsets.US_ASCII);
    }

    public record Encrypted(byte[] iv, byte[] ciphertext) {
    }
}
