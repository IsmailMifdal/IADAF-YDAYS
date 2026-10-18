-- Dossiers de suivi des packs achetés.

-- Pack dont la démarche est l'espace de suivi (NULL : démarche libre).
ALTER TABLE demarches.demarches ADD COLUMN pack_slug varchar(64);

-- Un seul dossier par pack et par utilisateur : rend l'endpoint
-- PUT /demarches/packs/{slug} idempotent, même sous appels concurrents.
CREATE UNIQUE INDEX uq_demarches_user_pack
    ON demarches.demarches (user_id, pack_slug)
    WHERE pack_slug IS NOT NULL;

-- Types des packs vendus. La contrainte d'origine, générée par Hibernate,
-- les refuserait : chaque création de dossier échouerait.
ALTER TABLE demarches.demarches DROP CONSTRAINT IF EXISTS demarches_type_demarche_check;
ALTER TABLE demarches.demarches ADD CONSTRAINT demarches_type_demarche_check CHECK (type_demarche IN (
    'TITRE_SEJOUR', 'NATURALISATION', 'VISA', 'REGROUPEMENT_FAMILIAL',
    'CARTE_RESIDENT', 'ASILE', 'RECOURS', 'RENOUVELLEMENT', 'AUTRE',
    'ASSURANCE_MALADIE', 'AIDE_LOGEMENT', 'IMPOTS'));

-- Effacement d'un compte : les étapes et commentaires suivent leur démarche.
ALTER TABLE demarches.etapes_demarche
    DROP CONSTRAINT IF EXISTS fkfv4tbs7krsk82lvea8mx6elo0,
    DROP CONSTRAINT IF EXISTS etapes_demarche_demarche_id_fkey,
    ADD CONSTRAINT fk_etapes_demarche FOREIGN KEY (demarche_id)
        REFERENCES demarches.demarches (id) ON DELETE CASCADE;
ALTER TABLE demarches.commentaires_demarche
    DROP CONSTRAINT IF EXISTS fkd9elwva4hmuhqy36eu01yjxqn,
    DROP CONSTRAINT IF EXISTS commentaires_demarche_demarche_id_fkey,
    ADD CONSTRAINT fk_commentaires_demarche FOREIGN KEY (demarche_id)
        REFERENCES demarches.demarches (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS ix_demarches_user_id ON demarches.demarches (user_id);
