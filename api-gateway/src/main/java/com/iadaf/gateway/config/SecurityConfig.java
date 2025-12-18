package com.iadaf.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverterAdapter;
import org.springframework.security.web.server.SecurityWebFilterChain;
import reactor.core.publisher.Mono;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Configuration de sécurité pour l'API Gateway
 * Valide les tokens JWT émis par Keycloak
 */
@Configuration
@EnableWebFluxSecurity
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
    value = "spring.security.enabled",
    havingValue = "true",
    matchIfMissing = true
)
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        http
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .authorizeExchange(exchange -> exchange
                // Endpoints publics (pas d'authentification requise)
                .pathMatchers("/actuator/health", "/actuator/info").permitAll()
                
                // Endpoints USER - accessibles par tous les utilisateurs authentifiés
                .pathMatchers("/api/users/**").hasAnyRole("USER", "ADMIN", "AGENT")
                .pathMatchers("/api/demarches/**").hasAnyRole("USER", "ADMIN", "AGENT")
                .pathMatchers("/api/documents/**").hasAnyRole("USER", "ADMIN", "AGENT")
                .pathMatchers("/api/ia/**").hasAnyRole("USER", "ADMIN", "AGENT")
                
                // Endpoints AGENT - réservés aux agents et admins
                .pathMatchers("/api/agent/**").hasAnyRole("AGENT", "ADMIN")
                
                // Endpoints SUPPORT - réservés au support et admins
                .pathMatchers("/api/analytics/**").hasAnyRole("SUPPORT", "ADMIN")
                
                // Endpoints ADMIN - réservés aux admins uniquement
                .pathMatchers("/api/admin/**").hasRole("ADMIN")
                
                // Tout le reste nécessite une authentification
                .anyExchange().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(grantedAuthoritiesExtractor()))
            );

        return http.build();
    }

    /**
     * Convertisseur pour extraire les rôles du token JWT Keycloak
     * Les rôles sont dans realm_access.roles
     */
    @Bean
    public Converter<Jwt, Mono<AbstractAuthenticationToken>> grantedAuthoritiesExtractor() {
        JwtAuthenticationConverter jwtAuthenticationConverter = new JwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(new KeycloakRoleConverter());
        return new ReactiveJwtAuthenticationConverterAdapter(jwtAuthenticationConverter);
    }

    /**
     * Classe interne pour convertir les rôles Keycloak en authorities Spring Security
     */
    static class KeycloakRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {
        
        @Override
        public Collection<GrantedAuthority> convert(Jwt jwt) {
            // Extraire les rôles depuis realm_access.roles
            Map<String, Object> realmAccess = jwt.getClaim("realm_access");
            
            if (realmAccess == null || !realmAccess.containsKey("roles")) {
                return List.of();
            }
            
            @SuppressWarnings("unchecked")
            List<String> roles = (List<String>) realmAccess.get("roles");
            
            // Convertir en GrantedAuthority avec le préfixe ROLE_
            return roles.stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                    .collect(Collectors.toList());
        }
    }
}
