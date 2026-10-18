package com.iadaf.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webtestclient.autoconfigure.AutoConfigureWebTestClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.reactive.server.WebTestClient;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * La gateway ne laisse passer que les appels du frontend : un appel direct au
 * port 8080, sans jeton interne valide, ne contourne plus la limitation de
 * débit ni n'atteint aucun service.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
@ActiveProfiles("test")
class ApiGatewayApplicationTests {

    @Autowired
    private WebTestClient client;

    @Test
    void callWithoutTokenIsRejected() {
        client.post().uri("/api/ai/chat").exchange().expectStatus().isUnauthorized();
        client.get().uri("/api/users").exchange().expectStatus().isUnauthorized();
    }

    @Test
    void forgedTokenIsRejected() {
        String forged = TestTokens.sign(
                "an-attacker-key-that-is-also-32-bytes-long!!",
                "iadaf-frontend", "iadaf-backend", "user-1", 60);
        client.get().uri("/api/users")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + forged)
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    void validTokenReachesRouting() {
        // Aucun service n'est enregistré dans ce test : passer la sécurité se
        // traduit par une erreur de routage, jamais par un 401.
        HttpStatus status = HttpStatus.valueOf(client.get().uri("/api/users")
                .header(HttpHeaders.AUTHORIZATION, TestTokens.bearer("user-1"))
                .exchange()
                .returnResult(String.class)
                .getStatus()
                .value());
        assertThat(status).isNotIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }

    @Test
    void healthCheckNeedsNoToken() {
        HttpStatus status = HttpStatus.valueOf(client.get().uri("/actuator/health")
                .exchange()
                .returnResult(String.class)
                .getStatus()
                .value());
        assertThat(status).isNotIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }
}
