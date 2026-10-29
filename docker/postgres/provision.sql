-- Comptes PostgreSQL par service : chacun possède son schéma, et rien d'autre.
--
-- Avant, tous les services se connectaient avec le superutilisateur : une
-- injection SQL dans n'importe lequel lisait les comptes, les pièces et les
-- ventes de tous (voire exécutait des commandes sur le serveur, COPY … TO
-- PROGRAM). Désormais :
--
--   iadaf_frontend   users (comptes de connexion, prospects, droits),
--                    billing (registre des ventes), ratelimit,
--                    erasures (journal des comptes supprimés)
--   iadaf_profiles   profiles (fiches du user-service)
--   iadaf_demarches  demarches
--   iadaf_documents  documents
--   iadaf_analytics  analytics
--   iadaf_ai         ai
--
-- Le superutilisateur (POSTGRES_USER) ne sert plus qu'à ce script, aux
-- sauvegardes et à l'administration.
--
-- Joué à chaque démarrage par le service db-provision, avant les autres.
-- Idempotent : crée ce qui manque, remet les mots de passe du .env, et rend à
-- chaque compte ce qui lui revient — y compris sur une base créée avant ce
-- script, où tout appartenait au superutilisateur.

\set ON_ERROR_STOP on
\getenv frontend_password FRONTEND_DB_PASSWORD
\getenv profiles_password PROFILES_DB_PASSWORD
\getenv demarches_password DEMARCHES_DB_PASSWORD
\getenv documents_password DOCUMENTS_DB_PASSWORD
\getenv analytics_password ANALYTICS_DB_PASSWORD
\getenv ai_password AI_DB_PASSWORD

BEGIN;
-- Rejoué stack démarrée, un changement de propriétaire attend la fin des
-- requêtes en cours sur la table : échouer plutôt qu'attendre sans fin.
SET LOCAL lock_timeout = '10s';
-- « schema … already exists » à chaque démarrage : du bruit, pas une alerte.
SET LOCAL client_min_messages = warning;

-- 1. Comptes : connexion seulement, aucun droit d'administration.
SELECT format('CREATE ROLE %I', name)
  FROM unnest(ARRAY['iadaf_frontend', 'iadaf_profiles', 'iadaf_demarches',
                    'iadaf_documents', 'iadaf_analytics', 'iadaf_ai']) AS name
 WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = name) \gexec

ALTER ROLE iadaf_frontend  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'frontend_password';
ALTER ROLE iadaf_profiles  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'profiles_password';
ALTER ROLE iadaf_demarches LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'demarches_password';
ALTER ROLE iadaf_documents LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'documents_password';
ALTER ROLE iadaf_analytics LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'analytics_password';
ALTER ROLE iadaf_ai        LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'ai_password';

-- 2. Schémas. Les services ne peuvent pas en créer : ils doivent exister.
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS ratelimit;
CREATE SCHEMA IF NOT EXISTS profiles;
CREATE SCHEMA IF NOT EXISTS demarches;
CREATE SCHEMA IF NOT EXISTS documents;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS erasures;

-- 3. Les fiches du user-service partageaient le schéma des comptes de
--    connexion : elles rejoignent le leur (séquence et index suivent).
SELECT 'ALTER TABLE users.users SET SCHEMA profiles'
 WHERE to_regclass('users.users') IS NOT NULL
   AND to_regclass('profiles.users') IS NULL \gexec

-- 4. Propriété : le schéma et tout ce qu'il contient ; personne d'autre n'y
--    entre (le superutilisateur passe outre, pour les sauvegardes).
CREATE FUNCTION pg_temp.give(target_schema text, new_owner text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
    object record;
BEGIN
    EXECUTE format('ALTER SCHEMA %I OWNER TO %I', target_schema, new_owner);
    FOR object IN
        SELECT c.relname,
               CASE c.relkind WHEN 'S' THEN 'SEQUENCE' WHEN 'v' THEN 'VIEW'
                              WHEN 'm' THEN 'MATERIALIZED VIEW' ELSE 'TABLE' END AS kind
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = target_schema
           AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
           -- A sequence behind a serial/identity column follows its table.
           AND NOT (c.relkind = 'S' AND EXISTS (
                   SELECT FROM pg_depend d
                    WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid
                      AND d.deptype IN ('a', 'i')))
    LOOP
        EXECUTE format('ALTER %s %I.%I OWNER TO %I', object.kind, target_schema, object.relname, new_owner);
    END LOOP;
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM PUBLIC', target_schema);
END;
$$;

DO $$
BEGIN
    PERFORM pg_temp.give('users', 'iadaf_frontend');
    PERFORM pg_temp.give('billing', 'iadaf_frontend');
    PERFORM pg_temp.give('ratelimit', 'iadaf_frontend');
    PERFORM pg_temp.give('profiles', 'iadaf_profiles');
    PERFORM pg_temp.give('demarches', 'iadaf_demarches');
    PERFORM pg_temp.give('documents', 'iadaf_documents');
    PERFORM pg_temp.give('analytics', 'iadaf_analytics');
    PERFORM pg_temp.give('ai', 'iadaf_ai');
    PERFORM pg_temp.give('erasures', 'iadaf_frontend');
END;
$$;

-- Ancienne table des prospects de l'AI Service, encore purgée par le frontend
-- à la suppression d'un compte tant qu'elle n'a pas été supprimée.
SELECT 'ALTER TABLE public.lead_emails OWNER TO iadaf_frontend'
 WHERE to_regclass('public.lead_emails') IS NOT NULL \gexec

-- 5. Rien de plus pour personne : ni nouveau schéma, ni table dans public.
SELECT format('REVOKE CREATE ON DATABASE %I FROM PUBLIC', current_database()) \gexec
--    Sur une ancienne base, des comptes avaient reçu CREATE en direct (le
--    retrait à PUBLIC ne le leur enlève pas), y compris l'ancien iadaf_user.
SELECT format('REVOKE CREATE ON DATABASE %I FROM %I', current_database(), name)
  FROM unnest(ARRAY['iadaf_frontend', 'iadaf_profiles', 'iadaf_demarches',
                    'iadaf_documents', 'iadaf_analytics', 'iadaf_ai',
                    'iadaf_user']) AS name
 WHERE EXISTS (SELECT FROM pg_roles WHERE rolname = name) \gexec
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

COMMIT;

\echo 'Comptes PostgreSQL par service : à jour.'
