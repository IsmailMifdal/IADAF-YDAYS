package com.iadaf.gateway.filter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.stream.Collectors;

/**
 * Filtre global qui extrait les informations JWT et les ajoute comme headers
 * pour les microservices downstream
 */
@Slf4j
@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private static final int FILTER_ORDER = -50;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .filter(Authentication::isAuthenticated)
                .flatMap(auth -> {
                    if (auth instanceof JwtAuthenticationToken) {
                        JwtAuthenticationToken jwtAuth = (JwtAuthenticationToken) auth;
                        Jwt jwt = jwtAuth.getToken();
                        
                        // Extraire les informations du JWT
                        String username = jwt.getClaimAsString("preferred_username");
                        String email = jwt.getClaimAsString("email");
                        String subject = jwt.getSubject();
                        
                        // Extraire les rôles
                        String roles = auth.getAuthorities().stream()
                                .map(GrantedAuthority::getAuthority)
                                .map(role -> role.replace("ROLE_", ""))
                                .collect(Collectors.joining(","));
                        
                        // Logger les informations JWT
                        log.info("🔑 JWT Info - Subject: {}, Username: {}, Email: {}, Roles: {}", 
                                subject, username, email, roles);
                        
                        // Ajouter les headers custom pour les microservices
                        ServerWebExchange mutatedExchange = exchange.mutate()
                                .request(request -> request
                                        .header("X-Auth-User", username != null ? username : subject)
                                        .header("X-Auth-Email", email != null ? email : "")
                                        .header("X-Auth-Roles", roles))
                                .build();
                        
                        return chain.filter(mutatedExchange);
                    }
                    
                    return chain.filter(exchange);
                })
                .switchIfEmpty(chain.filter(exchange));
    }

    @Override
    public int getOrder() {
        return FILTER_ORDER; // Exécuté après l'authentification mais avant AuthenticationLoggingFilter
    }
}
