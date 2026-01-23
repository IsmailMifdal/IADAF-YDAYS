# 🧪 IA-DAF Integration Tests

Suite complète de tests d'intégration pour vérifier le bon fonctionnement de tous les microservices.

## Prérequis

- Bash shell
- curl
- jq
- PostgreSQL client (psql)
- Tous les services démarrés

## Structure

```
tests/
├── integration/                      # Tests d'intégration complets
│   ├── test-all.sh                  # Lance tous les tests
│   ├── test-docker-infrastructure.sh # Test infrastructure Docker
│   ├── test-eureka-registration.sh  # Test enregistrement Eureka
│   ├── test-oauth2-flow.sh          # Test flux OAuth2
│   └── test-inter-service-communication.sh # Test communication
└── health-checks/                    # Vérifications rapides
    └── check-all-services.sh        # Health check de tous les services
```

## Utilisation

### Lancer tous les tests

```bash
cd tests/integration
chmod +x *.sh
./test-all.sh
```

### Lancer un test spécifique

```bash
# Test infrastructure Docker
./test-docker-infrastructure.sh

# Test enregistrement Eureka
./test-eureka-registration.sh

# Test OAuth2
./test-oauth2-flow.sh

# Test communication inter-services
./test-inter-service-communication.sh
```

### Health Check rapide

```bash
cd tests/health-checks
chmod +x check-all-services.sh
./check-all-services.sh
```

## Ce qui est testé

### Test 1: Infrastructure Docker
- ✅ Conteneurs PostgreSQL, Keycloak, pgAdmin running
- ✅ Connexion PostgreSQL
- ✅ Existence des schémas (users, demarches, documents, analytics, ai)
- ✅ Santé de Keycloak
- ✅ Configuration du realm

### Test 2: Enregistrement Eureka
- ✅ Eureka Server disponible
- ✅ Tous les microservices enregistrés
- ✅ Nombre d'instances correct

### Test 3: Flux OAuth2
- ✅ Obtention de token pour utilisateur admin
- ✅ Structure du token JWT valide
- ✅ Claims présents dans le token
- ✅ Token accepté par API Gateway
- ✅ Token invalide rejeté
- ✅ Authentification de tous les utilisateurs de test

### Test 4: Communication Inter-Services
- ✅ API Gateway → User Service
- ✅ API Gateway → Demarches Service
- ✅ API Gateway → Document Service
- ✅ API Gateway → Analytics Service
- ✅ API Gateway → AI Service
- ✅ Flux CRUD complet (Create/Read/Delete)

## Interprétation des Résultats

### ✅ Tous les tests PASSED
Le système est complètement fonctionnel. Tous les services communiquent correctement.

### ❌ Test Infrastructure FAILED
Vérifier que Docker Compose est lancé : `docker compose up -d`

### ❌ Test Eureka FAILED
- Vérifier que Discovery Service est démarré
- Attendre 30 secondes après le démarrage des services

### ❌ Test OAuth2 FAILED
- Vérifier que Keycloak est accessible
- Vérifier la configuration du realm
- Vérifier les credentials des utilisateurs de test

### ❌ Test Communication FAILED
- Vérifier que tous les services sont démarrés
- Vérifier les logs des services défaillants
- Vérifier la configuration réseau

## Troubleshooting

### Erreur: "jq command not found"
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# CentOS/RHEL
sudo yum install jq
```

### Erreur: "psql command not found"
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# CentOS/RHEL
sudo yum install postgresql
```

### Tests échouent de manière intermittente
- Augmenter les temps d'attente dans les scripts
- Vérifier la charge système
- Vérifier les ressources Docker disponibles

## CI/CD Integration

Pour intégrer dans un pipeline CI/CD:

```yaml
# GitHub Actions example
- name: Run Integration Tests
  run: |
    cd tests/integration
    chmod +x test-all.sh
    ./test-all.sh
```

## Contribution

Pour ajouter de nouveaux tests :
1. Créer un nouveau script dans `tests/integration/`
2. Suivre le format des tests existants
3. Ajouter l'appel dans `test-all.sh`
4. Mettre à jour ce README
