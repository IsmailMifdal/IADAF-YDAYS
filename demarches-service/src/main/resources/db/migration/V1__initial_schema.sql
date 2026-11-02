-- Schéma tel qu'Hibernate le créait (ddl-auto=update) avant l'arrivée de
-- Flyway. Rejoué seulement sur une base vierge : les bases existantes sont
-- marquées à cette version (baseline-on-migrate).

-- The schema is created by docker/postgres/provision.sql: service roles
-- cannot create schemas (CREATE ON DATABASE is revoked).

CREATE TABLE demarches.demarches (
    id                 bigserial PRIMARY KEY,
    active             boolean NOT NULL,
    date_creation      timestamp(6) without time zone NOT NULL,
    date_debut         date,
    date_echeance      date,
    date_fin           date,
    date_modification  timestamp(6) without time zone,
    description        text,
    notes              text,
    numero_reference   varchar(100),
    organisme_concerne varchar(200),
    priorite           varchar(30) NOT NULL,
    statut             varchar(30) NOT NULL,
    titre              varchar(200) NOT NULL,
    type_demarche      varchar(50) NOT NULL,
    user_id            varchar(255) NOT NULL,
    CONSTRAINT demarches_priorite_check CHECK (priorite IN ('HAUTE', 'MOYENNE', 'BASSE')),
    CONSTRAINT demarches_statut_check CHECK (statut IN ('EN_COURS', 'TERMINEE', 'ANNULEE', 'EN_ATTENTE')),
    CONSTRAINT demarches_type_demarche_check CHECK (type_demarche IN (
        'TITRE_SEJOUR', 'NATURALISATION', 'VISA', 'REGROUPEMENT_FAMILIAL',
        'CARTE_RESIDENT', 'ASILE', 'RECOURS', 'RENOUVELLEMENT', 'AUTRE'))
);

CREATE TABLE demarches.etapes_demarche (
    id                bigserial PRIMARY KEY,
    completee         boolean NOT NULL,
    date_completion   date,
    date_creation     timestamp(6) without time zone NOT NULL,
    date_modification timestamp(6) without time zone,
    description       text,
    ordre             integer NOT NULL,
    titre             varchar(200) NOT NULL,
    demarche_id       bigint NOT NULL REFERENCES demarches.demarches (id)
);

CREATE TABLE demarches.commentaires_demarche (
    id                bigserial PRIMARY KEY,
    contenu           text NOT NULL,
    date_creation     timestamp(6) without time zone NOT NULL,
    date_modification timestamp(6) without time zone,
    user_id           varchar(255) NOT NULL,
    demarche_id       bigint NOT NULL REFERENCES demarches.demarches (id)
);
