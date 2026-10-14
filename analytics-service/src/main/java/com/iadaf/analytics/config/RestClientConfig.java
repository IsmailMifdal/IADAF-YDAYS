package com.iadaf.analytics.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class RestClientConfig {

    /** En-tête portant l'identité de l'appelant, à propager en aval. */
    private static final String USER_ID_HEADER = "X-User-Id";

    /**
     * RestTemplate utilisé pour interroger les autres services.
     *
     * <p>L'intercepteur recopie l'en-tête {@code X-User-Id} de la requête entrante
     * sur chaque appel sortant. Sans lui, {@code demarches-service} — qui cloisonne
     * ses données par utilisateur — rejette les appels d'analytics en 403, ce qui
     * remonte ici en 503.
     *
     * <p>Le placer ici plutôt que dans chaque méthode garantit qu'aucun appel
     * futur n'oubliera la propagation.
     */
    @Bean
    public RestTemplate restTemplate() {
        RestTemplate restTemplate = new RestTemplate();

        restTemplate.getInterceptors().add((request, body, execution) -> {
            String userId = currentRequestHeader(USER_ID_HEADER);
            if (userId != null && !userId.isBlank()) {
                request.getHeaders().add(USER_ID_HEADER, userId);
            }
            return execution.execute(request, body);
        });

        return restTemplate;
    }

    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }

    /** Lit un en-tête de la requête HTTP en cours, ou null hors contexte web. */
    private static String currentRequestHeader(String name) {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            return attributes.getRequest().getHeader(name);
        }
        return null;
    }
}
