-- Pièces déposées dans l'espace d'un pack.
--
-- Le contenu est chiffré par le service (AES-256-GCM) avant d'arriver ici :
-- la base, ses sauvegardes et l'hébergeur ne voient que du chiffré.

-- The schema is created by docker/postgres/provision.sql: service roles
-- cannot create schemas (CREATE ON DATABASE is revoked).

CREATE TABLE documents.documents (
    id                uuid PRIMARY KEY,
    user_id           varchar(64)  NOT NULL,
    pack_slug         varchar(64)  NOT NULL,
    -- Pièce attendue, telle que listée par le pack (« Passeport », « RIB »…).
    document_type     varchar(200) NOT NULL,
    original_filename varchar(255) NOT NULL,
    content_type      varchar(100) NOT NULL,
    size_bytes        integer      NOT NULL,
    -- Empreinte du fichier en clair, pour détecter une altération.
    sha256            varchar(64)  NOT NULL,
    created_at        timestamptz  NOT NULL DEFAULT now(),
    -- Une pièce par type et par pack : un nouveau dépôt remplace l'ancien.
    CONSTRAINT uq_documents_slot UNIQUE (user_id, pack_slug, document_type)
);

CREATE INDEX ix_documents_user ON documents.documents (user_id);
CREATE INDEX ix_documents_created_at ON documents.documents (created_at);

-- Séparé des métadonnées : lister les pièces ne charge jamais les fichiers.
CREATE TABLE documents.document_contents (
    document_id uuid  PRIMARY KEY REFERENCES documents.documents (id) ON DELETE CASCADE,
    iv          bytea NOT NULL,
    ciphertext  bytea NOT NULL
);
