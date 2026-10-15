package com.iadaf.demarches.enums;

public enum TypeDemarche {
    TITRE_SEJOUR("Titre de séjour"),
    NATURALISATION("Naturalisation"),
    VISA("Visa"),
    REGROUPEMENT_FAMILIAL("Regroupement familial"),
    CARTE_RESIDENT("Carte de résident"),
    ASILE("Demande d'asile"),
    RECOURS("Recours"),
    RENOUVELLEMENT("Renouvellement"),
    // Démarches des packs vendus (titre de séjour : TITRE_SEJOUR ci-dessus).
    ASSURANCE_MALADIE("Assurance maladie"),
    AIDE_LOGEMENT("Aide au logement"),
    IMPOTS("Déclaration d'impôts"),
    AUTRE("Autre");

    private final String libelle;

    TypeDemarche(String libelle) {
        this.libelle = libelle;
    }

    public String getLibelle() {
        return libelle;
    }
}
