export type DemarcheStatut = 'EN_COURS' | 'TERMINEE' | 'EN_ATTENTE';

export interface Demarche {
  id: number;
  titre: string;
  description: string;
  statut: DemarcheStatut;
  dateCreation: string;
  dateModification: string;
  userId?: number;
}

export interface CreateDemarcheDto {
  titre: string;
  description: string;
  statut: DemarcheStatut;
}

export interface UpdateDemarcheDto {
  titre?: string;
  description?: string;
  statut?: DemarcheStatut;
}
