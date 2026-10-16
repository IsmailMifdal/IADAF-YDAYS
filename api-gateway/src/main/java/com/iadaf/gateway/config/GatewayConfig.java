package com.iadaf.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.cloud.gateway.support.RouteMetadataUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration des routes de l'API Gateway.
 *
 * Chaque route retire le préfixe /api puis délègue au service enregistré dans
 * Eureka (lb:// = load-balancing côté client).
 */
@Configuration
public class GatewayConfig {

    /** Au-delà du délai du client LLM de l'AI Service (OPENAI_TIMEOUT_SECONDS). */
    static final long AI_RESPONSE_TIMEOUT_MS = 90_000;

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                // /api/ai/**         → lb://AI-SERVICE/ai/**
                // Délai propre : une réponse non diffusée (analyse de dossier,
                // traduction) n'envoie rien avant d'être complète, et une
                // génération longue dépasse les 30 s accordés aux autres
                // routes. Les réponses diffusées (/ai/chat/stream) ne sont pas
                // concernées : le délai court entre deux lectures.
                .route("ai-service-gateway", r -> r
                        .path("/api/ai/**")
                        .filters(f -> f
                                .stripPrefix(1)
                                .addRequestHeader("X-Gateway", "API-Gateway"))
                        .metadata(RouteMetadataUtils.RESPONSE_TIMEOUT_ATTR, AI_RESPONSE_TIMEOUT_MS)
                        .uri("lb://AI-SERVICE"))

                // /api/users/**      → lb://USER-SERVICE/users/**
                .route("user-service-gateway", r -> r
                        .path("/api/users/**")
                        .filters(f -> f
                                .stripPrefix(1)
                                .addRequestHeader("X-Gateway", "API-Gateway"))
                        .uri("lb://USER-SERVICE"))

                // /api/demarches/**  → lb://DEMARCHES-SERVICE/demarches/**
                .route("demarches-service-gateway", r -> r
                        .path("/api/demarches/**")
                        .filters(f -> f
                                .stripPrefix(1)
                                .addRequestHeader("X-Gateway", "API-Gateway"))
                        .uri("lb://DEMARCHES-SERVICE"))

                // /api/documents/**  → lb://DOCUMENT-SERVICE/documents/**
                // Le service est enregistré mais n'expose encore aucun endpoint.
                .route("document-service-gateway", r -> r
                        .path("/api/documents/**")
                        .filters(f -> f
                                .stripPrefix(1)
                                .addRequestHeader("X-Gateway", "API-Gateway"))
                        .uri("lb://DOCUMENT-SERVICE"))

                // /api/analytics/**  → lb://ANALYTICS-SERVICE/analytics/**
                .route("analytics-service-gateway", r -> r
                        .path("/api/analytics/**")
                        .filters(f -> f
                                .stripPrefix(1)
                                .addRequestHeader("X-Gateway", "API-Gateway"))
                        .uri("lb://ANALYTICS-SERVICE"))

                .build();
    }
}
