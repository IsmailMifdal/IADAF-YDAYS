-- Résultats des pré-vérifications de pièces, en comptes anonymes.
--
-- Ni utilisateur, ni document, ni valeur extraite : uniquement le jour, la
-- catégorie de pièce et l'issue de chaque contrôle. Ce sont des statistiques,
-- pas des données personnelles.

CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE analytics.document_check_counts (
    day      date        NOT NULL,
    category varchar(20) NOT NULL,
    check_id varchar(30) NOT NULL,
    status   varchar(10) NOT NULL,
    count    integer     NOT NULL,
    PRIMARY KEY (day, category, check_id, status)
);
