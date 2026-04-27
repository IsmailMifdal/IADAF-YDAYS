package com.iadaf.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration des routes de l'API Gateway.
 * Seul le AI-SERVICE est actif pour le moment.
 */
@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                // Route vers AI Service  — /api/ai/** → lb://AI-SERVICE/ai/**
                .route("ai-service-gateway", r -> r
                        .path("/api/ai/**")
                        .filters(f -> f
                                .stripPrefix(1)
                                .addRequestHeader("X-Gateway", "API-Gateway"))
                        .uri("lb://AI-SERVICE"))
                .build();
    }
}
