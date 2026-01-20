-- Création des schémas pour chaque microservice dans la base iadaf_db (par défaut)
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS demarches;
CREATE SCHEMA IF NOT EXISTS documents;
CREATE SCHEMA IF NOT EXISTS analytics;

-- Commentaires descriptifs
COMMENT ON SCHEMA users IS 'Schéma pour le User Service';
COMMENT ON SCHEMA demarches IS 'Schéma pour le Demarches Service';
COMMENT ON SCHEMA documents IS 'Schéma pour le Document Service';
COMMENT ON SCHEMA analytics IS 'Schéma pour l''Analytics Service';

-- Afficher les schémas créés
\dn
