# Documentation Docker - IA-DAF

Ce document décrit comment mettre en place et utiliser l'environnement de développement Docker pour le projet IA-DAF.

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé
- [Docker Compose](https://docs.docker.com/compose/install/) installé (inclus avec Docker Desktop)

## Architecture

L'environnement Docker comprend :
- **PostgreSQL 15** : Base de données principale avec 4 schémas (users, demarches, documents, analytics)
- **pgAdmin 4** : Interface web pour gérer PostgreSQL

## Configuration

### Variables d'environnement

Copiez le fichier `.env.example` en `.env` et modifiez les valeurs si nécessaire :

```bash
cp .env.example .env
```

Le fichier `.env` contient les variables suivantes :

```env
# PostgreSQL Configuration
POSTGRES_DB=iadaf_db
POSTGRES_USER=iadaf_user
POSTGRES_PASSWORD=iadaf_password
POSTGRES_PORT=5432

# pgAdmin Configuration
PGADMIN_EMAIL=admin@iadaf.com
PGADMIN_PASSWORD=admin
PGADMIN_PORT=5050
```

⚠️ **Important** : Le fichier `.env` ne doit jamais être commité dans Git (il est déjà dans `.gitignore`).

## Commandes Docker

### Démarrer les services

Pour démarrer PostgreSQL et pgAdmin en arrière-plan :

```bash
docker compose up -d
```

### Voir les logs

Pour voir les logs de tous les services :

```bash
docker compose logs -f
```

Pour voir les logs d'un service spécifique :

```bash
docker compose logs -f postgres
docker compose logs -f pgadmin
```

### Arrêter les services

Pour arrêter les services sans supprimer les données :

```bash
docker compose down
```

### Arrêter et supprimer les volumes

Pour arrêter les services ET supprimer toutes les données persistantes :

```bash
docker compose down -v
```

⚠️ **Attention** : Cette commande supprime définitivement toutes les données de la base de données !

### Redémarrer les services

```bash
docker compose restart
```

### Vérifier l'état des services

```bash
docker compose ps
```

## Accès aux services

### PostgreSQL

- **Host** : `localhost`
- **Port** : `5432`
- **Database** : `iadaf_db`
- **Username** : `iadaf_user`
- **Password** : `iadaf_password`

**Connexion depuis la ligne de commande** :

```bash
psql -h localhost -p 5432 -U iadaf_user -d iadaf_db
```

**Connexion depuis un service Spring Boot** : Les services sont déjà configurés pour utiliser ces paramètres via les variables d'environnement.

### pgAdmin

- **URL** : [http://localhost:5050](http://localhost:5050)
- **Email** : `admin@iadaf.com`
- **Password** : `admin`

## Configuration de la connexion PostgreSQL dans pgAdmin

Pour connecter pgAdmin à PostgreSQL :

1. Ouvrir [http://localhost:5050](http://localhost:5050) dans un navigateur
2. Se connecter avec :
   - Email : `admin@iadaf.com`
   - Password : `admin`
3. Cliquer sur **"Add New Server"** ou **"Ajouter un nouveau serveur"**
4. Dans l'onglet **"General"** :
   - **Name** : `IADAF Database`
5. Dans l'onglet **"Connection"** :
   - **Host name/address** : `postgres` (nom du service Docker)
   - **Port** : `5432`
   - **Maintenance database** : `iadaf_db`
   - **Username** : `iadaf_user`
   - **Password** : `iadaf_password`
   - ✅ Cocher **"Save password"** pour ne pas avoir à la ressaisir
6. Cliquer sur **"Save"**

## Structure de la base de données

La base de données `iadaf_db` contient 4 schémas séparés :

### 1. Schema `users`
Utilisé par le **user-service** (port 8081)
- Tables pour la gestion des utilisateurs
- Authentification et autorisation

### 2. Schema `demarches`
Utilisé par le **demarches-service** (port 8082)
- Tables pour la gestion des démarches administratives

### 3. Schema `documents`
Utilisé par le **document-service** (port 8083)
- Tables pour la gestion des documents

### 4. Schema `analytics`
Utilisé par le **analytics-service** (port 8085)
- Tables pour les analyses et statistiques

## Initialisation de la base de données

Au premier démarrage, PostgreSQL exécute automatiquement le script `docker/postgres/init/01-init.sql` qui crée les 4 schémas nécessaires.

Si vous voulez ajouter d'autres scripts d'initialisation :
1. Créez un fichier `.sql` dans `docker/postgres/init/`
2. Nommez-le avec un préfixe numérique (ex: `02-seed-data.sql`)
3. Les scripts sont exécutés dans l'ordre alphabétique

## Configuration des services Spring Boot

Chaque service Spring Boot est configuré pour :
- Se connecter à `iadaf_db`
- Utiliser son propre schéma (users, demarches, documents, ou analytics)
- Lire les credentials depuis les variables d'environnement

Exemple de configuration dans `application.yml` :

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/iadaf_db?currentSchema=users
    username: ${POSTGRES_USER:iadaf_user}
    password: ${POSTGRES_PASSWORD:iadaf_password}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
        default_schema: users
```

## Dépannage

### PostgreSQL ne démarre pas

Vérifiez que le port 5432 n'est pas déjà utilisé :

```bash
# Linux/Mac
lsof -i :5432

# Windows
netstat -ano | findstr :5432
```

Si le port est occupé, arrêtez le service qui l'utilise ou modifiez le port dans `docker-compose.yml`.

### pgAdmin ne démarre pas

Vérifiez que le port 5050 n'est pas déjà utilisé :

```bash
# Linux/Mac
lsof -i :5050

# Windows
netstat -ano | findstr :5050
```

### Les données ne persistent pas

Vérifiez que le volume Docker existe :

```bash
docker volume ls | grep postgres_data
```

Si le volume n'existe pas, il sera créé au prochain `docker compose up`.

### Connexion refusée depuis un service Spring Boot

Vérifiez que :
1. PostgreSQL est bien démarré : `docker compose ps`
2. Les variables d'environnement sont bien définies
3. Le health check PostgreSQL est OK : `docker compose ps postgres`

### Réinitialiser complètement la base de données

```bash
# Arrêter les services et supprimer les volumes
docker compose down -v

# Redémarrer
docker compose up -d
```

## Commandes utiles

### Exécuter une commande SQL directement

```bash
docker exec -it iadaf-postgres psql -U iadaf_user -d iadaf_db -c "SELECT current_schema();"
```

### Accéder au shell PostgreSQL

```bash
docker exec -it iadaf-postgres psql -U iadaf_user -d iadaf_db
```

### Lister les schémas

```sql
SELECT schema_name FROM information_schema.schemata;
```

### Voir les tables d'un schéma

```sql
\dt users.*
\dt demarches.*
\dt documents.*
\dt analytics.*
```

### Sauvegarder la base de données

```bash
docker exec -it iadaf-postgres pg_dump -U iadaf_user iadaf_db > backup.sql
```

### Restaurer la base de données

```bash
docker exec -i iadaf-postgres psql -U iadaf_user -d iadaf_db < backup.sql
```

## Structure des fichiers

```
ia-daf/
├── docker-compose.yml          # Configuration Docker Compose
├── .env.example                # Template des variables d'environnement
├── .env                        # Variables d'environnement (non commité)
├── DOCKER.md                   # Cette documentation
└── docker/
    └── postgres/
        └── init/
            └── 01-init.sql     # Script d'initialisation SQL
```

## Bonnes pratiques

1. **Sécurité** : 
   - Ne jamais commiter le fichier `.env`
   - Utiliser des mots de passe forts en production
   - Changer les credentials par défaut

2. **Développement** :
   - Toujours démarrer Docker avant de lancer les services Spring Boot
   - Utiliser `docker compose logs -f` pour debugger
   - Sauvegarder régulièrement si vous travaillez avec des données importantes

3. **Production** :
   - Utiliser des volumes externes pour les backups
   - Configurer des healthchecks appropriés
   - Mettre en place une stratégie de backup automatique

## Liens utiles

- [Documentation Docker Compose](https://docs.docker.com/compose/)
- [Documentation PostgreSQL](https://www.postgresql.org/docs/)
- [Documentation pgAdmin](https://www.pgadmin.org/docs/)
- [Spring Boot avec PostgreSQL](https://spring.io/guides/gs/accessing-data-postgresql/)
