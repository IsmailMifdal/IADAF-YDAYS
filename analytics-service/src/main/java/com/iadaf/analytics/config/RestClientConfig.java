package com.iadaf.analytics.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class RestClientConfig {

    /**
     * RestTemplate utilisé pour interroger les autres services.
     *
     * <p>L'intercepteur recopie le jeton interne de la requête entrante
     * ({@code Authorization: Bearer …}) sur chaque appel sortant : les services
     * en aval exigent ce jeton, et en tirent l'identité qui cloisonne leurs
     * données. Le jeton expire en 60 s, largement le temps d'un agrégat.
     *
     * <p>Le placer ici plutôt que dans chaque méthode garantit qu'aucun appel
     * futur n'oubliera la propagation.
     */
    @Bean
    public RestTemplate restTemplate() {
        RestTemplate restTemplate = new RestTemplate();

        restTemplate.getInterceptors().add((request, body, execution) -> {
            String authorization = currentRequestHeader(HttpHeaders.AUTHORIZATION);
            if (authorization != null && !authorization.isBlank()) {
                request.getHeaders().set(HttpHeaders.AUTHORIZATION, authorization);
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
