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
    AUTRE("Autre");

    private final String libelle;

    TypeDemarche(String libelle) {
        this.libelle = libelle;
    }

    public String getLibelle() {
        return libelle;
    }
}
