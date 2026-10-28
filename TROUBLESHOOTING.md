# 🔧 Guide de dépannage IA-DAF

## Le frontend refuse de démarrer : `AUTH_SECRET is required`

`docker-compose.yml` bloque volontairement le démarrage plutôt que de lancer
l'application avec une configuration d'authentification incomplète.

```bash
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env
docker compose up -d frontend
```

---

## Erreur : « authentification par mot de passe échouée »

### Symptôme
```
FATAL: authentification par mot de passe a échoué pour l'utilisateur « iadaf_user »
```

### Solution

1. **Vérifier que le fichier `.env` existe** :
   ```bash
   ls -la .env          # sinon : cp .env.example .env
   ```

2. **Vérifier la cohérence du mot de passe.** Le volume PostgreSQL conserve le
   mot de passe défini à sa **première** initialisation. Changer
   `POSTGRES_PASSWORD` après coup ne met pas la base à jour.

   ```bash
   # Repartir d'une base vierge (⚠️ efface les données)
   docker compose down -v
   docker compose up -d postgres
   ```

3. **Tester la connexion** :
   ```bash
   docker exec -it iadaf-postgres psql -U iadaf_user -d iadaf_db -c "SELECT 1;"
   ```

---

## Les tables `app_users` / `pack_entitlements` n'existent pas

Les scripts de `docker/postgres/init/` ne sont exécutés **que sur un volume
PostgreSQL vierge**. Sur une base déjà initialisée, ils ne rejouent jamais.

Le frontend applique le même DDL de façon idempotente au premier accès :
ouvrez http://localhost:3000 une fois, puis vérifiez :

```bash
docker exec iadaf-postgres psql -U iadaf_user -d iadaf_db -c "\dt users.*"
```

---

## Flyway: `Migration checksum mismatch for migration version 1`

`demarches-service`, `document-service` or `analytics-service` stops at startup
with this error on a database created before issue #42. Their V1 migration no
longer runs
`CREATE SCHEMA` (schemas are created by `docker/postgres/provision.sql`), so
its checksum changed; the resulting schema is identical.

Local data you do not need: start from a fresh volume.

```bash
docker compose down -v && docker compose up -d --build
```

Data to keep: run `flyway repair`, which only realigns the stored checksum
(no SQL is replayed), with the stack running, then restart the services.
Passwords are the `*_DB_PASSWORD` values of your `.env` (defaults shown):

```bash
while read -r service schema password; do
  docker run --rm --network iadaf-ydays_iadaf-network \
    -v "$PWD/$service/src/main/resources/db/migration:/flyway/sql:ro" \
    flyway/flyway:11 -url=jdbc:postgresql://postgres:5432/iadaf_db \
    -user="iadaf_$schema" -password="$password" -schemas="$schema" repair
done <<'EOF'
demarches-service demarches dev-demarches-db
document-service documents dev-documents-db
analytics-service analytics dev-analytics-db
EOF
docker restart iadaf-demarches iadaf-document iadaf-analytics
```

---

## Erreur : « Port 8080 already in use »

```bash
# Linux/Mac
lsof -i :8080
kill -9 <PID>

# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

---

## Erreur : « Discovery Service unavailable »

Les services ne s'enregistrent pas dans Eureka.

1. **Vérifier que Discovery Service répond** :
   ```bash
   curl http://localhost:8761/actuator/health
   ```

2. **Respecter l'ordre de démarrage** :
   - ✅ 1. PostgreSQL
   - ✅ 2. Discovery Service
   - ✅ 3. API Gateway et AI Service
   - ✅ 4. Frontend

   `docker compose up` applique cet ordre via les `healthcheck` ; en lancement
   manuel, c'est à vous de le respecter.

3. **Compter ~30 s** après le démarrage pour voir les instances apparaître :
   ```bash
   curl http://localhost:8761/eureka/apps | grep -i "<name>"
   ```

---

## Le chatbot répond toujours la même chose (mode dégradé)

L'AI Service n'arrive pas à joindre le LLM.

```bash
docker compose logs ai-service | grep -i -E "openai|llm"
```

Vérifier que `OPENAI_API_KEY` est renseignée dans `.env` **et** que le
conteneur a été recréé depuis :

```bash
docker compose up -d --force-recreate ai-service
```

---

## Le paiement affiche « non configuré »

`STRIPE_SECRET_KEY` est absente. Récupérez une clé de test sur
https://dashboard.stripe.com/test/apikeys et renseignez-la dans `.env`.

## Le paiement aboutit mais le pack reste verrouillé

Le déblocage passe **uniquement** par le webhook. Si Stripe ne peut pas
joindre l'application, aucun droit n'est écrit.

```bash
# En local, ouvrir un tunnel :
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Reporter le secret `whsec_...` affiché dans `STRIPE_WEBHOOK_SECRET`, puis
redémarrer le frontend. Vérifier ensuite :

```bash
docker compose logs frontend | grep stripe-webhook
docker exec iadaf-postgres psql -U iadaf_user -d iadaf_db \
  -c "SELECT * FROM users.pack_entitlements;"
```

---

## Connexion impossible après changement de `AUTH_SECRET`

Les sessions existantes sont signées avec l'ancien secret et deviennent
invalides. Videz les cookies du site, ou ouvrez une fenêtre de navigation
privée.

---

## Tests de connectivité

### PostgreSQL
```bash
docker exec -it iadaf-postgres psql -U iadaf_user -d iadaf_db -c "\dt users.*"
```

### AI Service
```bash
curl http://localhost:8086/ai/health
```

### Eureka
```bash
curl http://localhost:8761/eureka/apps | grep -i "<name>"
```

### API Gateway
```bash
curl http://localhost:8080/actuator/health
curl http://localhost:8080/actuator/gateway/routes | jq
```

### Santé globale
```bash
bash tests/health-checks/check-all-services.sh
```
