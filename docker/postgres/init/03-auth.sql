-- Comptes d'authentification du frontend (Auth.js / NextAuth).
--
-- Les scripts de ce dossier ne sont joués QU'À la première initialisation d'un
-- volume PostgreSQL vide. Le frontend applique le même DDL de façon idempotente
-- au premier accès, ce qui couvre les bases déjà existantes.

CREATE TABLE IF NOT EXISTS users.app_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    name          VARCHAR(255),
    -- NULL pour les comptes créés via un fournisseur OAuth.
    password_hash TEXT,
    image         TEXT,
    provider      VARCHAR(50) NOT NULL DEFAULT 'credentials',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE users.app_users IS 'Comptes utilisateurs du frontend IA-DAF';
