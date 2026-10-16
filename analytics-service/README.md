# Analytics Service

Statistiques d'IA-DAF : celles des dossiers de l'appelant, quelques vues
globales réservées à l'administration, et les comptes anonymes de la
pré-vérification des pièces (avec les résultats contestés par les
utilisateurs, qui mesurent la fiabilité de chaque contrôle).

## Technologies

- Spring Boot 4.0.8 (Spring Framework 7), Spring Cloud Netflix Eureka
- Spring Security OAuth2 Resource Server : jetons internes HS256 signés par le
  frontend (voir [SECURITY.md](../SECURITY.md#-jetons-internes))
- PostgreSQL, schéma `analytics`, compte `iadaf_analytics` limité à ce
  schéma ; migrations Flyway (`src/main/resources/db/migration`)
- RestTemplate vers les autres services (délais : 3 s à la connexion, 10 s à
  la lecture), le jeton de l'appelant recopié sur chaque appel

## Routes

| Méthode | Chemin | Accès | Description |
|---------|--------|-------|-------------|
| GET | `/analytics/demarches/statut` | jeton valide | Répartition des dossiers de l'appelant par statut |
| GET | `/analytics/demarches/type` | jeton valide | … par type |
| GET | `/analytics/demarches/evolution` | jeton valide | … dans le temps (`startDate`, `endDate`, `period`) |
| GET | `/analytics/dashboard` | scope `admin` | Synthèse globale (fiches utilisateur, dossiers) |
| GET | `/analytics/users/activity` | scope `admin` | Activité par fiche utilisateur |
| POST | `/analytics/document-checks` | jeton valide | Comptes anonymes d'une pré-vérification (envoyés par l'AI Service) |
| POST | `/analytics/document-checks/disputes` | jeton valide | Un résultat signalé comme faux (relayé par le frontend) |
| GET | `/analytics/document-checks` | scope `analytics:read` | Totaux par contrôle, avec les résultats contestés |

Les comptes de pré-vérification sont validés contre un vocabulaire fermé
(catégorie, identifiant de contrôle, issue) : aucun texte libre, donc aucune
donnée personnelle, ne peut y entrer.

Le scope `admin` n'est porté par aucun jeton aujourd'hui (pas de back-office) :
ces vues sont fermées tant qu'il n'existe pas.

## Configuration

| Variable | Rôle |
|----------|------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://postgres:5432/iadaf_db?currentSchema=analytics` |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | Compte `iadaf_analytics` (docker-compose.yml) |
| `INTERNAL_JWT_SECRET` | Clé des jetons internes (32 octets minimum, refuse de démarrer sinon) |
| `USER_SERVICE_URL`, `DEMARCHES_SERVICE_URL`, `DOCUMENT_SERVICE_URL` | Services interrogés |

Port : 8085. Santé : `GET /actuator/health` (sans jeton, sans détail).

## Cache

Désactivé (`@EnableCaching` retiré, voir `AnalyticsServiceApplication`) : les
clés des `@Cacheable` existants ne contiennent pas l'utilisateur, et un cache
actif servirait les chiffres du premier appelant à tous les suivants.

## Construire et lancer

```bash
mvn -pl analytics-service -am verify     # depuis la racine du dépôt
docker compose up -d analytics-service   # avec la stack
```
