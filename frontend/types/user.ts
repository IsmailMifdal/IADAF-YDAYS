export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  languePreferee: string;
  paysOrigine?: string;
  villeResidence?: string;
  dateCreation?: string;
  dateModification?: string;
}

export interface UserProfile extends User {
  roles: string[];
}
