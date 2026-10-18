package com.iadaf.document.storage;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DocumentCipherTest {

    private static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);
    private final DocumentCipher cipher = new DocumentCipher(KEY);
    private final byte[] passport = "%PDF-1.7 passeport".getBytes(StandardCharsets.UTF_8);

    @Test
    void roundTrip() {
        UUID id = UUID.randomUUID();
        DocumentCipher.Encrypted encrypted = cipher.encrypt(id, passport);

        assertThat(encrypted.ciphertext()).isNotEqualTo(passport);
        assertThat(cipher.decrypt(id, encrypted.iv(), encrypted.ciphertext())).isEqualTo(passport);
    }

    @Test
    void sameFileTwiceGivesDifferentCiphertexts() {
        UUID id = UUID.randomUUID();
        assertThat(cipher.encrypt(id, passport).ciphertext())
                .isNotEqualTo(cipher.encrypt(id, passport).ciphertext());
    }

    @Test
    void contentMovedToAnotherDocumentIsRejected() {
        DocumentCipher.Encrypted encrypted = cipher.encrypt(UUID.randomUUID(), passport);

        assertThatThrownBy(() -> cipher.decrypt(UUID.randomUUID(), encrypted.iv(), encrypted.ciphertext()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void tamperedContentIsRejected() {
        UUID id = UUID.randomUUID();
        DocumentCipher.Encrypted encrypted = cipher.encrypt(id, passport);
        encrypted.ciphertext()[0] ^= 1;

        assertThatThrownBy(() -> cipher.decrypt(id, encrypted.iv(), encrypted.ciphertext()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void missingOrShortKeyRefusesToStart() {
        assertThatThrownBy(() -> new DocumentCipher("")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new DocumentCipher(Base64.getEncoder().encodeToString(new byte[16])))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new DocumentCipher("not base64 !!")).isInstanceOf(IllegalStateException.class);
    }
}
