package com.iadaf.demarches.enums;

public enum StatutDemarche {
    EN_COURS("En cours"),
    TERMINEE("Terminée"),
    ANNULEE("Annulée"),
    EN_ATTENTE("En attente");

    private final String libelle;

    StatutDemarche(String libelle) {
        this.libelle = libelle;
    }

    public String getLibelle() {
        return libelle;
    }
}
