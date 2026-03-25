package com.iadaf.demarches.enums;

public enum PrioriteDemarche {
    HAUTE("Haute"),
    MOYENNE("Moyenne"),
    BASSE("Basse");

    private final String libelle;

    PrioriteDemarche(String libelle) {
        this.libelle = libelle;
    }

    public String getLibelle() {
        return libelle;
    }
}
