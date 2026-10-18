package com.iadaf.analytics.config;

import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Collection;

/**
 * Jetons internes signés par le frontend Next.js.
 *
 * <p>Le frontend porte l'authentification (Auth.js) et signe, pour chaque appel
 * vers le backend, un JWT HS256 de 60 secondes avec {@code INTERNAL_JWT_SECRET}.
 * Son sujet ({@code sub}) est l'identifiant de l'utilisateur connecté, absent
 * pour un visiteur anonyme.
 *
 * <p>Même contrat dans la gateway et dans chaque service : un appel direct à un
 * service, sans passer par le frontend, est rejeté.
 */
final class InternalJwt {

    static final String ISSUER = "iadaf-frontend";
    static final String AUDIENCE = "iadaf-backend";

    /** HS256 exige une clé d'au moins 256 bits. */
    private static final int MIN_SECRET_BYTES = 32;

    private InternalJwt() {
    }

    static JwtDecoder decoder(String secret) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key(secret))
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        decoder.setJwtValidator(validator());
        return decoder;
    }

    private static SecretKey key(String secret) {
        byte[] bytes = secret == null ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < MIN_SECRET_BYTES) {
            // Refuser de démarrer plutôt que d'accepter des jetons signés avec
            // une clé vide ou devinable.
            throw new IllegalStateException(
                    "INTERNAL_JWT_SECRET manquant ou trop court (32 octets minimum)");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    private static OAuth2TokenValidator<Jwt> validator() {
        return new DelegatingOAuth2TokenValidator<>(
                // Expiration (tolérance de 60 s) et émetteur.
                JwtValidators.createDefaultWithIssuer(ISSUER),
                new JwtClaimValidator<Collection<String>>(
                        JwtClaimNames.AUD, aud -> aud != null && aud.contains(AUDIENCE)));
    }
}
