package com.iadaf.gateway.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Controller de fallback pour gérer les erreurs des microservices
 */
@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> userServiceFallback() {
        return buildFallbackResponse("User Service");
    }

    @GetMapping("/demarches")
    public ResponseEntity<Map<String, Object>> demarchesServiceFallback() {
        return buildFallbackResponse("Demarches Service");
    }

    @GetMapping("/documents")
    public ResponseEntity<Map<String, Object>> documentServiceFallback() {
        return buildFallbackResponse("Document Service");
    }

    @GetMapping("/ia")
    public ResponseEntity<Map<String, Object>> aiServiceFallback() {
        return buildFallbackResponse("AI Service");
    }

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> analyticsServiceFallback() {
        return buildFallbackResponse("Analytics Service");
    }

    private ResponseEntity<Map<String, Object>> buildFallbackResponse(String serviceName) {
        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", LocalDateTime.now());
        response.put("status", HttpStatus.SERVICE_UNAVAILABLE.value());
        response.put("error", "Service Unavailable");
        response.put("message", serviceName + " is currently unavailable. Please try again later.");
        response.put("service", serviceName);
        
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
    }
}
