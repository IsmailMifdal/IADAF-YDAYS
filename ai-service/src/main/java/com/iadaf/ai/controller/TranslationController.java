package com.iadaf.ai.controller;

import com.iadaf.ai.dto.TranslationRequest;
import com.iadaf.ai.dto.TranslationResponse;
import com.iadaf.ai.service.TranslationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@Slf4j
public class TranslationController {

    private final TranslationService translationService;

    @PostMapping("/translate")
    public ResponseEntity<TranslationResponse> translate(
            @Valid @RequestBody TranslationRequest request) {
        log.info("REST request to translate text to: {}", request.getTargetLanguage());
        TranslationResponse response = translationService.translate(request);
        return ResponseEntity.ok(response);
    }
}
