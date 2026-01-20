#!/bin/bash
set -e

# Script pour créer la base de données Keycloak
# Exécuté automatiquement par le conteneur PostgreSQL

echo "🔐 Création de la base de données Keycloak..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
    SELECT 'CREATE DATABASE keycloak_db'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak_db')\gexec
    
    GRANT ALL PRIVILEGES ON DATABASE keycloak_db TO $POSTGRES_USER;
EOSQL

echo "✅ Base de données keycloak_db créée avec succès"
