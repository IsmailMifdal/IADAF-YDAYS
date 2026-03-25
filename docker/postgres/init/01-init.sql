-- Création des schémas pour chaque microservice dans la base iadaf_db
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS demarches;
CREATE SCHEMA IF NOT EXISTS documents;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS ai;

-- Commentaires descriptifs
COMMENT ON SCHEMA users IS 'Schéma pour le User Service';
COMMENT ON SCHEMA demarches IS 'Schéma pour le Demarches Service';
COMMENT ON SCHEMA documents IS 'Schéma pour le Document Service';
COMMENT ON SCHEMA analytics IS 'Schéma pour l''Analytics Service';
COMMENT ON SCHEMA ai IS 'Schéma pour l''AI Service';

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA users TO iadaf_user;
GRANT ALL PRIVILEGES ON SCHEMA demarches TO iadaf_user;
GRANT ALL PRIVILEGES ON SCHEMA documents TO iadaf_user;
GRANT ALL PRIVILEGES ON SCHEMA analytics TO iadaf_user;
GRANT ALL PRIVILEGES ON SCHEMA ai TO iadaf_user;

-- Display created schemas
\dn
