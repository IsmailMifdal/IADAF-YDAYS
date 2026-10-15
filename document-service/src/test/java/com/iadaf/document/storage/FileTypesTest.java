package com.iadaf.document.storage;

import com.iadaf.document.service.DocumentService;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class FileTypesTest {

    private static byte[] bytes(int... values) {
        byte[] out = new byte[values.length];
        for (int i = 0; i < values.length; i++) {
            out[i] = (byte) values[i];
        }
        return out;
    }

    @Test
    void acceptsAdministrativeFormats() {
        assertThat(FileTypes.detect("%PDF-1.4\n".getBytes(StandardCharsets.US_ASCII))).contains("application/pdf");
        assertThat(FileTypes.detect(bytes(0xFF, 0xD8, 0xFF, 0xE0, 0x00))).contains("image/jpeg");
        assertThat(FileTypes.detect(bytes(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00))).contains("image/png");
    }

    @Test
    void rejectsEverythingElseWhateverItsName() {
        assertThat(FileTypes.detect(bytes(0x4D, 0x5A, 0x90, 0x00))).isEmpty();            // exécutable Windows
        assertThat(FileTypes.detect("<html><script>".getBytes(StandardCharsets.UTF_8))).isEmpty();
        assertThat(FileTypes.detect(bytes(0x50, 0x4B, 0x03, 0x04))).isEmpty();            // zip / docx
        assertThat(FileTypes.detect(new byte[0])).isEmpty();
        assertThat(FileTypes.detect(bytes(0x25, 0x50))).isEmpty();                         // %P tronqué
    }
}
