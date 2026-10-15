package com.iadaf.document.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SafeFilenameTest {

    @Test
    void stripsPathsAndControlCharacters() {
        assertThat(DocumentService.safeFilename("../../etc/passwd.pdf", "application/pdf")).isEqualTo("passwd.pdf");
        assertThat(DocumentService.safeFilename("C:\\Users\\a\\rib.pdf", "application/pdf")).isEqualTo("rib.pdf");
        assertThat(DocumentService.safeFilename("a\r\nContent-Type: x\".pdf", "application/pdf"))
                .isEqualTo("aContent-Type: x.pdf");
    }

    @Test
    void extensionFollowsTheRealType() {
        assertThat(DocumentService.safeFilename("passeport.exe", "application/pdf")).isEqualTo("passeport.exe.pdf");
        assertThat(DocumentService.safeFilename("photo.JPEG", "image/jpeg")).isEqualTo("photo.JPEG");
        assertThat(DocumentService.safeFilename("", "image/png")).isEqualTo("piece.png");
        assertThat(DocumentService.safeFilename(null, "image/png")).isEqualTo("piece.png");
    }
}
