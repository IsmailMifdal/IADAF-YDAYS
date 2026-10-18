package com.iadaf.gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.web.server.SecurityWebFilterChain;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Collection;

/**
 * Seul le frontend Next.js peut appeler la gateway.
 *
 * <p>Il signe, pour chaque appel, un JWT HS256 de 60 secondes avec
 * {@code INTERNAL_JWT_SECRET} ({@code iss=iadaf-frontend},
 * {@code aud=iadaf-backend}, {@code sub} = utilisateur connecté s'il y en a un).
 * Tout appel sans jeton valide est rejeté en 401 : un client qui joindrait le
 * port 8080 directement ne contourne donc plus la limitation de débit du
 * frontend. Les services en aval revalident le même jeton.
 */
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    static final String ISSUER = "iadaf-frontend";
    static final String AUDIENCE = "iadaf-backend";

    /** HS256 exige une clé d'au moins 256 bits. */
    private static final int MIN_SECRET_BYTES = 32;

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
                .logout(ServerHttpSecurity.LogoutSpec::disable)
                .authorizeExchange(exchange -> exchange
                        // Healthcheck Docker et Eureka, sans jeton.
                        .pathMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        // Pré-vol CORS : le navigateur n'y joint jamais de jeton.
                        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyExchange().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
                .build();
    }

    @Bean
    public ReactiveJwtDecoder jwtDecoder(@Value("${iadaf.security.internal-jwt-secret:}") String secret) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < MIN_SECRET_BYTES) {
            // Refuser de démarrer plutôt que d'accepter des jetons signés avec
            // une clé vide ou devinable.
            throw new IllegalStateException(
                    "INTERNAL_JWT_SECRET manquant ou trop court (32 octets minimum)");
        }

        NimbusReactiveJwtDecoder decoder = NimbusReactiveJwtDecoder
                .withSecretKey(new SecretKeySpec(bytes, "HmacSHA256"))
                .macAlgorithm(MacAlgorithm.HS256)
                .build();

        OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(ISSUER),
                new JwtClaimValidator<Collection<String>>(
                        JwtClaimNames.AUD, aud -> aud != null && aud.contains(AUDIENCE)));
        decoder.setJwtValidator(validator);
        return decoder;
    }
}
