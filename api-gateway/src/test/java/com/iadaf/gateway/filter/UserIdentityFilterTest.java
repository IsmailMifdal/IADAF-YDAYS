package com.iadaf.gateway.filter;

import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class UserIdentityFilterTest {

    private final UserIdentityFilter filter = new UserIdentityFilter();

    @Test
    void forgedHeaderIsReplacedByTheTokenSubject() {
        ServerHttpRequest relayed = relay(forgedRequest(), token("real-user"));

        assertThat(relayed.getHeaders().get("X-User-Id")).containsExactly("real-user");
    }

    @Test
    void forgedHeaderIsDroppedForAnAnonymousToken() {
        ServerHttpRequest relayed = relay(forgedRequest(), token(null));

        assertThat(relayed.getHeaders().containsKey("X-User-Id")).isFalse();
    }

    private static MockServerHttpRequest forgedRequest() {
        return MockServerHttpRequest.get("/api/demarches")
                .header("X-User-Id", "victim")
                .build();
    }

    private static Jwt token(String subject) {
        Jwt.Builder builder = Jwt.withTokenValue("t").header("alg", "HS256").claim("iss", "iadaf-frontend");
        if (subject != null) {
            builder.subject(subject);
        }
        return builder.build();
    }

    private ServerHttpRequest relay(MockServerHttpRequest request, Jwt jwt) {
        ServerWebExchange exchange = MockServerWebExchange.from(request).mutate()
                .principal(Mono.just(new JwtAuthenticationToken(jwt)))
                .build();
        AtomicReference<ServerHttpRequest> relayed = new AtomicReference<>();
        GatewayFilterChain chain = ex -> {
            relayed.set(ex.getRequest());
            return Mono.empty();
        };

        filter.filter(exchange, chain).block();
        return relayed.get();
    }
}
