package com.iadaf.document.storage;

import java.util.Optional;

/**
 * Type réel d'un fichier, lu dans ses premiers octets.
 *
 * <p>Ni l'extension ni le {@code Content-Type} envoyés par le navigateur ne sont
 * fiables : un exécutable renommé {@code passeport.pdf} passerait. Seuls les
 * formats d'une pièce administrative sont acceptés.
 */
public final class FileTypes {

    private FileTypes() {
    }

    public static Optional<String> detect(byte[] content) {
        if (startsWith(content, 0x25, 0x50, 0x44, 0x46, 0x2D)) {         // %PDF-
            return Optional.of("application/pdf");
        }
        if (startsWith(content, 0xFF, 0xD8, 0xFF)) {                       // JPEG
            return Optional.of("image/jpeg");
        }
        if (startsWith(content, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) { // PNG
            return Optional.of("image/png");
        }
        return Optional.empty();
    }

    private static boolean startsWith(byte[] content, int... signature) {
        if (content.length < signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if ((content[i] & 0xFF) != signature[i]) {
                return false;
            }
        }
        return true;
    }
}
