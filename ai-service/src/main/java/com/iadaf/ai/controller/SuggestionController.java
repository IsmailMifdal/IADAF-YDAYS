package com.iadaf.ai.controller;

import com.iadaf.ai.dto.SuggestionDTO;
import com.iadaf.ai.service.SuggestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@Slf4j
public class SuggestionController {

    private final SuggestionService suggestionService;

    @PostMapping("/suggest-demarche")
    public ResponseEntity<List<SuggestionDTO>> suggestDemarche(
            @RequestParam(required = false) String userProfile,
            @RequestParam(required = false) String userHistory) {
        log.info("REST request to suggest demarches");
        List<SuggestionDTO> suggestions = suggestionService.suggestDemarches(userProfile, userHistory);
        return ResponseEntity.ok(suggestions);
    }
}
