# demarches-service — Service désactivé

> ⚠️ **Ce service est temporairement désactivé.**

Dans le cadre de la refactorisation de l'architecture IA-DAF, ce service Java/Spring Boot
a été mis en veille. Ses fonctionnalités seront intégrées dans une future version.

## Architecture actuelle (simplifiée)

Les trois services actifs sont :

1. **discovery-service** — Eureka Discovery Server (port 8761)
2. **api-gateway** — Spring Cloud Gateway (port 8080)
3. **ai-service** — Service IA Python/FastAPI (port 8086)

## Pour démarrer le projet

```bash
docker compose up
```

Pour plus d'informations, consultez le [README principal](../README.md).
