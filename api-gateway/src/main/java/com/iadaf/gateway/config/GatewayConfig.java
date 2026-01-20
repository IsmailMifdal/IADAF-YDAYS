package com.iadaf.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;

/**
 * Configuration des routes de l'API Gateway
 */
@Configuration
public class GatewayConfig {

    /**
     * Configuration des routes personnalisées
     * Les routes automatiques via Eureka sont gérées dans application.yml
     */
    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                // Route vers User Service
                .route("user-service", r -> r
                        .path("/api/users/**")
                        .filters(f -> f
                                .stripPrefix(1)
                                .addRequestHeader("X-Gateway", "API-Gateway")
                                .circuitBreaker(config -> config
                                        .setName("userServiceCircuitBreaker")
                                        .setFallbackUri("forward:/fallback/users")))
                        .uri("lb://USER-SERVICE"))
                
                // Route vers Demarches Service
                .route("demarches-service", r -> r
                        .path("/api/demarches/**")
                        .filters(f -> f
                                .stripPrefix(1)
                                .addRequestHeader("X-Gateway", "API-Gateway")
                                .circuitBreaker(config -> config
                                        .setName("demarchesServiceCircuitBreaker")
                                        .setFallbackUri("forward:/fallback/demarches")))
                        .uri("lb://DEMARCHES-SERVICE"))
                
                // Route vers Document Service
                .route("document-service", r -> r
                        .path("/api/documents/**")
                        .filters(f -> f
                                .stripPrefix(1)
                                .addRequestHeader("X-Gateway", "API-Gateway")
                                .circuitBreaker(config -> config
                                        .setName("documentServiceCircuitBreaker")
                                        .setFallbackUri("forward:/fallback/documents")))
                        .uri("lb://DOCUMENT-SERVICE"))
                
                // Route vers AI Service
                .route("ai-service", r -> r
                        .path("/api/ia/**")
                        .filters(f -> f
                                .stripPrefix(1)
                                .addRequestHeader("X-Gateway", "API-Gateway")
                                .circuitBreaker(config -> config
                                        .setName("aiServiceCircuitBreaker")
                                        .setFallbackUri("forward:/fallback/ia")))
                        .uri("lb://AI-SERVICE"))
                
                // Route vers Analytics Service
                .route("analytics-service", r -> r
                        .path("/api/analytics/**")
                        .filters(f -> f
                                .stripPrefix(1)
                                .addRequestHeader("X-Gateway", "API-Gateway")
                                .circuitBreaker(config -> config
                                        .setName("analyticsServiceCircuitBreaker")
                                        .setFallbackUri("forward:/fallback/analytics")))
                        .uri("lb://ANALYTICS-SERVICE"))
                
                .build();
    }
}
