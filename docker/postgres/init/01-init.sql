-- Schémas de la base iadaf_db, un par service.
--
-- Joué une seule fois, à l'initialisation d'un volume vide. Comptes,
-- propriétaires et droits sont l'affaire de provision.sql (service
-- db-provision), rejoué à chaque démarrage.
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS ratelimit;
CREATE SCHEMA IF NOT EXISTS profiles;
CREATE SCHEMA IF NOT EXISTS demarches;
CREATE SCHEMA IF NOT EXISTS documents;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS erasures;

COMMENT ON SCHEMA users IS 'Frontend : comptes de connexion, prospects, droits sur les packs';
COMMENT ON SCHEMA billing IS 'Frontend : registre des ventes';
COMMENT ON SCHEMA ratelimit IS 'Frontend : compteurs de limitation de débit';
COMMENT ON SCHEMA profiles IS 'User Service';
COMMENT ON SCHEMA demarches IS 'Demarches Service';
COMMENT ON SCHEMA documents IS 'Document Service';
COMMENT ON SCHEMA analytics IS 'Analytics Service';
COMMENT ON SCHEMA ai IS 'AI Service';
COMMENT ON SCHEMA erasures IS 'Frontend : journal des comptes supprimés, rejoué après une restauration';
