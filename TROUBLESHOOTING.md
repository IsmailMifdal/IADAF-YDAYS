# 🔧 Guide de Dépannage IA-DAF

## Erreur : "authentification par mot de passe échouée"

### Symptôme
```
FATAL: authentification par mot de passe échouée pour l'utilisateur « iadaf_user »
```

### Solution

1. **Vérifier que le fichier `.env` existe** :
   ```bash
   ls -la .env
   ```
   
   Si absent, créer depuis le template :
   ```bash
   cp .env.example .env
   ```

2. **Recréer les conteneurs Docker** :
   ```bash
   docker compose down -v
   docker compose up -d
   ```

3. **Exporter les variables d'environnement** :
   ```bash
   set -a
   source .env
   set +a
   ```

4. **Tester la connexion PostgreSQL** :
   ```bash
   docker exec -it iadaf-postgres psql -U iadaf_user -d iadaf_db -c "SELECT 1;"
   ```

5. **Démarrer le service avec les variables** :
   ```bash
   cd user-service
   mvn spring-boot:run
   ```

---

## Erreur : "Port 8080 already in use"

### Solution

1. **Trouver le processus utilisant le port** :
   ```bash
   # Linux/Mac
   lsof -i :8080
   
   # Windows
   netstat -ano | findstr :8080
   ```

2. **Tuer le processus** :
   ```bash
   # Linux/Mac
   kill -9 <PID>
   
   # Windows
   taskkill /PID <PID> /F
   ```

---

## Erreur : "Discovery Service unavailable"

### Symptôme
Les services ne s'enregistrent pas dans Eureka.

### Solution

1. **Vérifier que Discovery Service est démarré** :
   ```bash
   curl http://localhost:8761
   ```

2. **Vérifier l'ordre de démarrage** :
   - ✅ 1. Docker (PostgreSQL, Keycloak)
   - ✅ 2. Discovery Service
   - ✅ 3. Autres microservices
   - ✅ 4. API Gateway

3. **Vérifier les logs Eureka** :
   ```bash
   cd discovery-service
   mvn spring-boot:run
   # Chercher "Registered instance" dans les logs
   ```

---

## Erreur : "HHH90000025: PostgreSQLDialect does not need to be specified"

### Solution

Supprimer la ligne `dialect:` dans `application.yml` :

```yaml
spring:
  jpa:
    properties:
      hibernate:
        # dialect: org.hibernate.dialect.PostgreSQLDialect  # ❌ SUPPRIMER
        format_sql: true
```

---

## Keycloak : "Realm not found"

### Solution

1. **Vérifier que Keycloak est démarré** :
   ```bash
   docker logs iadaf-keycloak
   ```

2. **Vérifier que le realm est importé** :
   ```bash
   curl http://localhost:8180/realms/iadaf/.well-known/openid-configuration
   ```

3. **Réimporter le realm manuellement** :
   - Ouvrir http://localhost:8180
   - Login: admin / admin
   - Import realm depuis `docker/keycloak/realm-export.json`

---

## Tests de connectivité

### PostgreSQL
```bash
docker exec -it iadaf-postgres psql -U iadaf_user -d iadaf_db -c "\dt users.*"
```

### Keycloak
```bash
curl http://localhost:8180/realms/iadaf/.well-known/openid-configuration | jq
```

### Eureka
```bash
curl http://localhost:8761/eureka/apps | grep -i "user-service"
```

### API Gateway
```bash
curl http://localhost:8080/actuator/health
curl http://localhost:8080/actuator/gateway/routes | jq
```
