package com.iadaf.analytics;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/**
 * Service d'agrégation statistique.
 *
 * <p><b>@EnableCaching a été retiré volontairement.</b> Les méthodes de
 * {@code AnalyticsService} portent des {@code @Cacheable} dont les clés sont
 * constantes ({@code 'byStatut'}, {@code 'summary'}…) alors que les données
 * qu'elles agrègent sont cloisonnées par utilisateur : le premier appelant
 * aurait rempli le cache et tous les suivants auraient lu ses chiffres.
 *
 * <p>Le cache n'avait par ailleurs aucune politique d'expiration. Pour le
 * réactiver, il faut d'abord intégrer l'identifiant utilisateur dans chaque clé
 * et définir un TTL. Les annotations sont conservées pour documenter l'intention.
 */
@SpringBootApplication
@EnableDiscoveryClient
public class AnalyticsServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AnalyticsServiceApplication.class, args);
    }
}
