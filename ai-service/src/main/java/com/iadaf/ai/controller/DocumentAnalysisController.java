package com.iadaf.ai.controller;

import com.iadaf.ai.dto.AnalysisResult;
import com.iadaf.ai.dto.DocumentAnalysisRequest;
import com.iadaf.ai.service.DocumentAnalysisService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@Slf4j
public class DocumentAnalysisController {

    private final DocumentAnalysisService documentAnalysisService;

    @PostMapping("/analyze-document")
    public ResponseEntity<AnalysisResult> analyzeDocument(
            @Valid @RequestBody DocumentAnalysisRequest request) {
        log.info("REST request to analyze document");
        AnalysisResult result = documentAnalysisService.analyzeDocument(request);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/extract-info")
    public ResponseEntity<AnalysisResult> extractInfo(
            @Valid @RequestBody DocumentAnalysisRequest request) {
        log.info("REST request to extract info from document");
        // This uses the same service as analyze-document but can have different behavior if needed
        AnalysisResult result = documentAnalysisService.analyzeDocument(request);
        return ResponseEntity.ok(result);
    }
}
