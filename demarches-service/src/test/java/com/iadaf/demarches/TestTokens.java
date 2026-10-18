package com.iadaf.demarches;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

/**
 * Jetons internes signés comme le fait le frontend, pour exercer le vrai
 * décodeur plutôt que de le court-circuiter.
 */
public final class TestTokens {

    /** Identique à {@code iadaf.security.internal-jwt-secret} du profil test. */
    public static final String SECRET = "test-secret-at-least-32-bytes-long-0123456789";

    private TestTokens() {
    }

    public static String bearer(String subject) {
        return "Bearer " + sign(SECRET, "iadaf-frontend", "iadaf-backend", subject, 60);
    }

    /** Jeton portant un droit supplémentaire, comme {@code account:erase}. */
    public static String bearer(String subject, String scope) {
        return "Bearer " + sign(SECRET, "iadaf-frontend", "iadaf-backend", subject, 60, scope);
    }

    public static String sign(String secret, String issuer, String audience,
                              String subject, long ttlSeconds) {
        return sign(secret, issuer, audience, subject, ttlSeconds, null);
    }

    public static String sign(String secret, String issuer, String audience,
                              String subject, long ttlSeconds, String scope) {
        Instant now = Instant.now();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .claim("scope", scope)
                .issuer(issuer)
                .audience(audience)
                .subject(subject)
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(ttlSeconds)))
                .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        try {
            jwt.sign(new MACSigner(secret.getBytes(StandardCharsets.UTF_8)));
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
        return jwt.serialize();
    }
}
