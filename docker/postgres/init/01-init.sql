-- Création des schémas pour chaque microservice
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS demarches;
CREATE SCHEMA IF NOT EXISTS documents;
CREATE SCHEMA IF NOT EXISTS analytics;

-- Commentaires
COMMENT ON SCHEMA users IS 'Schéma pour le User Service';
COMMENT ON SCHEMA demarches IS 'Schéma pour le Demarches Service';
COMMENT ON SCHEMA documents IS 'Schéma pour le Document Service';
COMMENT ON SCHEMA analytics IS 'Schéma pour l''Analytics Service';

-- Base de données pour Keycloak
CREATE DATABASE keycloak_db;

-- Se connecter à keycloak_db et configurer
\c keycloak_db;

COMMENT ON DATABASE keycloak_db IS 'Base de données pour Keycloak IAM';
