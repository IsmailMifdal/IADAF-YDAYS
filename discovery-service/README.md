# Discovery Service - Eureka Server

## Description

Service de découverte basé sur Netflix Eureka Server. Permet aux microservices de s'enregistrer automatiquement et de se découvrir mutuellement.

## Fonctionnalités

- ✅ Enregistrement automatique des microservices
- ✅ Dashboard web de monitoring
- ✅ Health checks automatiques
- ✅ Load balancing côté client
- ✅ Haute disponibilité (mode cluster)

## Démarrage

### Mode développement (standalone)

```bash
cd discovery-service
mvn spring-boot:run
```

### Mode production

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

### Mode cluster (2 instances)

**Terminal 1 - Instance 1** :
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=peer1
```

**Terminal 2 - Instance 2** :
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=peer2
```

## Accès

- **Dashboard Eureka** : http://localhost:8761
- **Health check** : http://localhost:8761/actuator/health
- **Informations** : http://localhost:8761/actuator/info

## Configuration des clients Eureka

Pour qu'un microservice s'enregistre auprès d'Eureka, ajouter dans son `application.yml` :

```yaml
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
    register-with-eureka: true
    fetch-registry: true
  instance:
    prefer-ip-address: true
    lease-renewal-interval-in-seconds: 10
    lease-expiration-duration-in-seconds: 30
```

Et ajouter la dépendance dans le `pom.xml` :

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
```

## Architecture

```
┌─────────────────────────────────────────┐
│      Discovery Service (Eureka)        │
│           Port: 8761                    │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
  ┌──────────┐        ┌──────────┐
  │ Service  │        │ Service  │
  │    A     │        │    B     │
  └──────────┘        └──────────┘
```

## Monitoring

Le dashboard Eureka affiche :
- Liste des services enregistrés
- Nombre d'instances par service
- Statut de santé de chaque instance
- Métadonnées des services

## Troubleshooting

### Le service ne démarre pas

Vérifier que le port 8761 n'est pas déjà utilisé :
```bash
# Linux/Mac
lsof -i :8761

# Windows
netstat -ano | findstr :8761
```

### Un service ne s'enregistre pas

1. Vérifier que la dépendance `eureka-client` est présente
2. Vérifier l'URL dans `eureka.client.service-url.defaultZone`
3. Vérifier les logs du service client

### Mode self-preservation activé

Message : "EMERGENCY! EUREKA MAY BE INCORRECTLY CLAIMING INSTANCES ARE UP WHEN THEY'RE NOT"

**En développement** : C'est normal, le mode est désactivé dans `application.yml`
**En production** : Indique des problèmes réseau ou des services qui tombent

## Sécurité (évolution future)

Pour sécuriser Eureka en production :

1. Ajouter Spring Security
2. Configurer l'authentification Basic
3. Utiliser HTTPS
4. Restreindre les IPs autorisées

## Dépendances

- Spring Boot 3.2.0
- Spring Cloud 2023.0.0
- Netflix Eureka Server

## Logs

Les logs incluent :
- Enregistrement des services
- Renouvellement des leases
- Expiration des instances
- Erreurs de communication

Niveau de log configurable dans `application.yml`.
