package com.iadaf.gateway.filter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Filtre pour logger les informations d'authentification
 */
@Slf4j
@Component
public class AuthenticationLoggingFilter implements GlobalFilter, Ordered {

    private static final int FILTER_ORDER = -100;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .doOnNext(auth -> {
                    if (auth != null && auth.isAuthenticated()) {
                        log.info("🔐 Authenticated request: {} {} - User: {} - Roles: {}", 
                                exchange.getRequest().getMethod(),
                                exchange.getRequest().getURI().getPath(),
                                auth.getName(),
                                auth.getAuthorities());
                    } else {
                        log.info("🔓 Unauthenticated request: {} {}", 
                                exchange.getRequest().getMethod(),
                                exchange.getRequest().getURI().getPath());
                    }
                })
                .then(chain.filter(exchange));
    }

    @Override
    public int getOrder() {
        return FILTER_ORDER; // Exécuté après l'authentification
    }
}
