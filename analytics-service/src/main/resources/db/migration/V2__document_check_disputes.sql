-- Résultats de pré-vérification contestés (« ce résultat est faux »), en
-- comptes anonymes.
--
-- Rapportés aux comptes de document_check_counts, ils donnent le taux
-- d'erreur de chaque contrôle : la mesure à prendre avant de décider
-- d'entraîner un modèle. Comme la table V1 : ni utilisateur, ni document, ni
-- valeur lue — le jour, la catégorie de pièce, le contrôle et le résultat
-- affiché.

CREATE TABLE analytics.document_check_disputes (
    day      date        NOT NULL,
    category varchar(20) NOT NULL,
    check_id varchar(30) NOT NULL,
    status   varchar(10) NOT NULL,
    count    integer     NOT NULL,
    PRIMARY KEY (day, category, check_id, status)
);
