package com.iadaf.analytics.config;

import java.time.Duration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class RestClientConfig {

    static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    /** Sous les 30 s de la gateway, pour que l'erreur vienne d'ici. */
    static final Duration READ_TIMEOUT = Duration.ofSeconds(10);

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
        // Sans délai, un service en aval qui ne répond pas retenait la
        // requête indéfiniment : la gateway finissait par renvoyer 504, sans
        // qu'aucune trace ne dise lequel. Avec : une erreur nommée, à temps.
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        RestTemplate restTemplate = new RestTemplate(requestFactory);

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
