# Analytics Service

Statistiques d'IA-DAF : les comptes anonymes de la pré-vérification des
pièces, avec les résultats contestés par les utilisateurs, qui mesurent la
fiabilité de chaque contrôle.

## Technologies

- Spring Boot 4.0.8 (Spring Framework 7), Spring Cloud Netflix Eureka
- Spring Security OAuth2 Resource Server : jetons internes HS256 signés par le
  frontend (voir [SECURITY.md](../SECURITY.md#-jetons-internes))
- PostgreSQL, schéma `analytics`, compte `iadaf_analytics` limité à ce
  schéma ; migrations Flyway (`src/main/resources/db/migration`)

## Routes

| Méthode | Chemin | Accès | Description |
|---------|--------|-------|-------------|
| POST | `/analytics/document-checks` | jeton valide | Comptes anonymes d'une pré-vérification (envoyés par l'AI Service) |
| POST | `/analytics/document-checks/disputes` | jeton valide | Un résultat signalé comme faux (relayé par le frontend) |
| GET | `/analytics/document-checks` | scope `analytics:read` | Totaux par contrôle, avec les résultats contestés |

Les comptes de pré-vérification sont validés contre un vocabulaire fermé
(catégorie, identifiant de contrôle, issue) : aucun texte libre, donc aucune
donnée personnelle, ne peut y entrer.

## Configuration

| Variable | Rôle |
|----------|------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://postgres:5432/iadaf_db?currentSchema=analytics` |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | Compte `iadaf_analytics` (docker-compose.yml) |
| `INTERNAL_JWT_SECRET` | Clé des jetons internes (32 octets minimum, refuse de démarrer sinon) |

Port : 8085. Santé : `GET /actuator/health` (sans jeton, sans détail).

## Construire et lancer

```bash
mvn -pl analytics-service -am verify     # depuis la racine du dépôt
docker compose up -d analytics-service   # avec la stack
```
