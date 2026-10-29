-- Résultats des pré-vérifications de pièces, en comptes anonymes.
--
-- Ni utilisateur, ni document, ni valeur extraite : uniquement le jour, la
-- catégorie de pièce et l'issue de chaque contrôle. Ce sont des statistiques,
-- pas des données personnelles.

-- The schema is created by docker/postgres/provision.sql: service roles
-- cannot create schemas (CREATE ON DATABASE is revoked).

CREATE TABLE analytics.document_check_counts (
    day      date        NOT NULL,
    category varchar(20) NOT NULL,
    check_id varchar(30) NOT NULL,
    status   varchar(10) NOT NULL,
    count    integer     NOT NULL,
    PRIMARY KEY (day, category, check_id, status)
);
