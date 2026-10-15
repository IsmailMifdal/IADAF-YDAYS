package com.iadaf.gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Optional;

/**
 * Pose {@code X-User-Id} à partir du jeton vérifié, et de lui seul.
 *
 * <p>Tout {@code X-User-Id} envoyé par l'appelant est supprimé : la gateway est
 * le seul point où cet en-tête peut être écrit, à partir du sujet d'un jeton
 * dont elle a vérifié la signature. Pour un visiteur anonyme (jeton sans
 * sujet), l'en-tête est simplement absent.
 */
@Component
public class UserIdentityFilter implements GlobalFilter, Ordered {

    static final String USER_ID_HEADER = "X-User-Id";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return exchange.getPrincipal()
                .ofType(JwtAuthenticationToken.class)
                .map(auth -> Optional.ofNullable(auth.getToken().getSubject()))
                .defaultIfEmpty(Optional.empty())
                .flatMap(subject -> {
                    ServerHttpRequest request = exchange.getRequest().mutate()
                            .headers(headers -> {
                                headers.remove(USER_ID_HEADER);
                                subject.filter(s -> !s.isBlank())
                                        .ifPresent(s -> headers.set(USER_ID_HEADER, s));
                            })
                            .build();
                    return chain.filter(exchange.mutate().request(request).build());
                });
    }

    @Override
    public int getOrder() {
        // Avant le routage, pour que l'en-tête parte avec la requête relayée.
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
