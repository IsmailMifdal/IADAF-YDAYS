# 🧪 IA-DAF — Tests d'intégration

Suite de tests vérifiant que la stack complète est opérationnelle et que les
services communiquent correctement.

## Prérequis

- Bash, `curl`
- Docker (les scripts interrogent PostgreSQL via `docker exec` — `psql` n'est
  pas requis sur l'hôte)
- La stack démarrée : `docker compose up -d`

## Structure

```
tests/
├── integration/
│   ├── test-all.sh                        # Lance toute la suite
│   ├── test-docker-infrastructure.sh      # Conteneurs, base, schémas, tables
│   ├── test-eureka-registration.sh        # Enregistrement des services
│   └── test-inter-service-communication.sh # Chaîne applicative complète
└── health-checks/
    └── check-all-services.sh              # Vérification rapide
```

## Utilisation

### Toute la suite

```bash
bash tests/integration/test-all.sh
```

### Un test en particulier

```bash
bash tests/integration/test-docker-infrastructure.sh
bash tests/integration/test-eureka-registration.sh
bash tests/integration/test-inter-service-communication.sh
```

### Vérification rapide

```bash
bash tests/health-checks/check-all-services.sh
```

Le script renvoie le nombre de services en échec comme code de sortie —
exploitable directement en CI.

## Ce qui est testé

### Test 1 — Infrastructure Docker

- ✅ Conteneurs `postgres`, `discovery`, `gateway`, `ai`, `front` démarrés
- ✅ Connexion PostgreSQL
- ✅ Schémas `users`, `demarches`, `documents`, `analytics`, `ai`
- ✅ Tables `users.app_users` et `users.pack_entitlements`

### Test 2 — Enregistrement Eureka

- ✅ Serveur Eureka disponible
- ✅ Services enregistrés

### Test 3 — Communication inter-services

- ✅ API Gateway → AI Service (`/api/ai/health`, `/api/ai/chat`)
- ✅ Frontend → API Gateway (proxy `/api/ai/*`)
- ✅ Création de compte, refus des doublons, connexion, session active
- ✅ Routes privées refusées sans session, accessibles avec
- ✅ Paywall : pack non payé redirigé vers le paiement
- ✅ Checkout refusé sans authentification et sur un pack inconnu
- ✅ Webhook Stripe rejeté sans signature valide

## Interprétation des résultats

| Échec | Pistes |
|-------|--------|
| **Infrastructure** | `docker compose up -d`, puis `docker compose ps` |
| **Tables applicatives absentes** | Ouvrir http://localhost:3000 une fois — le frontend crée les tables au premier accès |
| **Eureka** | Le Discovery Service doit démarrer en premier ; compter ~30 s |
| **Communication** | `docker compose logs <service>` ; vérifier `OPENAI_API_KEY` si le chat échoue |
| **Webhook autre que 400/503** | La vérification de signature Stripe ne fonctionne pas — voir [SECURITY.md](../SECURITY.md) |

## Données de test

`test-inter-service-communication.sh` crée un compte
`test-suite-<pid>@example.com` à chaque exécution. Pour les supprimer :

```bash
docker exec iadaf-postgres psql -U iadaf_user -d iadaf_db \
  -c "DELETE FROM users.app_users WHERE email LIKE 'test-suite-%';"
```

Les droits d'accès aux packs sont supprimés en cascade avec le compte.

## Dépannage

### Tests intermittents au démarrage

L'AI Service met environ 4 minutes à démarrer la première fois (téléchargement
du modèle d'embeddings). Attendez que `docker compose ps` l'affiche `healthy`.

### Conflit de port 3000

Un `npm run dev` local empêche le conteneur `iadaf-front` de démarrer. Arrêtez
l'un ou l'autre.

## Intégration CI/CD

```yaml
# Exemple GitHub Actions
- name: Run Integration Tests
  run: |
    docker compose up -d --build
    bash tests/health-checks/check-all-services.sh
    bash tests/integration/test-all.sh
```

## Contribution

Pour ajouter de nouveaux tests :

1. Créer un script dans `tests/integration/`
2. Suivre le format des tests existants (sortie colorée, compteurs, code de sortie)
3. Ajouter l'appel dans `test-all.sh`
4. Mettre à jour ce README
