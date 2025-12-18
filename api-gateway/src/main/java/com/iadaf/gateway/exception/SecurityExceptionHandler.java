package com.iadaf.gateway.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.reactive.error.ErrorWebExceptionHandler;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

/**
 * Gestionnaire global des exceptions de sécurité
 */
@Slf4j
@Component
@Order(-2)
public class SecurityExceptionHandler implements ErrorWebExceptionHandler {

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        if (ex instanceof AuthenticationException) {
            return handleAuthenticationException(exchange, (AuthenticationException) ex);
        } else if (ex instanceof AccessDeniedException) {
            return handleAccessDeniedException(exchange, (AccessDeniedException) ex);
        }
        
        return Mono.error(ex);
    }

    private Mono<Void> handleAuthenticationException(ServerWebExchange exchange, AuthenticationException ex) {
        log.error("🚫 Authentication failed: {}", ex.getMessage());
        
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        
        String errorResponse = String.format(
            "{\"timestamp\":\"%s\",\"status\":401,\"error\":\"Unauthorized\",\"message\":\"%s\",\"path\":\"%s\"}",
            LocalDateTime.now(),
            "Authentication required. Please provide a valid JWT token.",
            exchange.getRequest().getURI().getPath()
        );
        
        byte[] bytes = errorResponse.getBytes(StandardCharsets.UTF_8);
        return exchange.getResponse().writeWith(Mono.just(exchange.getResponse()
                .bufferFactory().wrap(bytes)));
    }

    private Mono<Void> handleAccessDeniedException(ServerWebExchange exchange, AccessDeniedException ex) {
        log.error("🚫 Access denied: {}", ex.getMessage());
        
        exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        
        String errorResponse = String.format(
            "{\"timestamp\":\"%s\",\"status\":403,\"error\":\"Forbidden\",\"message\":\"%s\",\"path\":\"%s\"}",
            LocalDateTime.now(),
            "You don't have permission to access this resource.",
            exchange.getRequest().getURI().getPath()
        );
        
        byte[] bytes = errorResponse.getBytes(StandardCharsets.UTF_8);
        return exchange.getResponse().writeWith(Mono.just(exchange.getResponse()
                .bufferFactory().wrap(bytes)));
    }
}
