package com.iadaf.gateway.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Contrôleur de test pour valider l'authentification JWT et les autorisations
 */
@Slf4j
@RestController
@RequestMapping("/api/auth")
public class AuthTestController {

    /**
     * Endpoint pour récupérer les informations de l'utilisateur authentifié
     * Accessible par tout utilisateur authentifié
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(
            @AuthenticationPrincipal Jwt jwt,
            Authentication authentication) {
        
        log.info("📋 User info requested by: {}", jwt.getSubject());
        
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("subject", jwt.getSubject());
        userInfo.put("username", jwt.getClaimAsString("preferred_username"));
        userInfo.put("email", jwt.getClaimAsString("email"));
        userInfo.put("name", jwt.getClaimAsString("name"));
        userInfo.put("givenName", jwt.getClaimAsString("given_name"));
        userInfo.put("familyName", jwt.getClaimAsString("family_name"));
        
        // Roles
        userInfo.put("roles", authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(role -> role.replace("ROLE_", ""))
                .collect(Collectors.toList()));
        
        // Token metadata
        userInfo.put("issuedAt", jwt.getIssuedAt());
        userInfo.put("expiresAt", jwt.getExpiresAt());
        userInfo.put("issuer", jwt.getIssuer());
        
        // Calculate time remaining
        if (jwt.getExpiresAt() != null) {
            long secondsRemaining = jwt.getExpiresAt().getEpochSecond() - Instant.now().getEpochSecond();
            userInfo.put("expiresInSeconds", secondsRemaining);
        }
        
        return ResponseEntity.ok(userInfo);
    }

    /**
     * Endpoint de test pour les admins uniquement
     * Accessible uniquement par les utilisateurs avec le rôle ADMIN
     */
    @GetMapping("/admin/test")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> adminTest(@AuthenticationPrincipal Jwt jwt) {
        log.info("🔐 Admin endpoint accessed by: {}", jwt.getSubject());
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "✅ Admin access granted");
        response.put("user", jwt.getClaimAsString("preferred_username"));
        response.put("email", jwt.getClaimAsString("email"));
        response.put("endpoint", "/api/auth/admin/test");
        response.put("role", "ADMIN");
        response.put("timestamp", Instant.now());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint de test pour les agents
     * Accessible par les utilisateurs avec le rôle AGENT ou ADMIN
     */
    @GetMapping("/agent/test")
    @PreAuthorize("hasAnyRole('AGENT', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> agentTest(@AuthenticationPrincipal Jwt jwt) {
        log.info("👮 Agent endpoint accessed by: {}", jwt.getSubject());
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "✅ Agent access granted");
        response.put("user", jwt.getClaimAsString("preferred_username"));
        response.put("email", jwt.getClaimAsString("email"));
        response.put("endpoint", "/api/auth/agent/test");
        response.put("allowedRoles", new String[]{"AGENT", "ADMIN"});
        response.put("timestamp", Instant.now());
        
        return ResponseEntity.ok(response);
    }
}
