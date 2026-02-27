import apiClient from './client';

export interface Demarche {
  id: number;
  titre: string;
  description: string;
  statut: 'EN_COURS' | 'TERMINEE' | 'EN_ATTENTE';
  dateCreation: string;
  dateModification: string;
}

export const demarchesApi = {
  getAll: () => apiClient.get<Demarche[]>('/demarches'),
  
  getById: (id: number) => apiClient.get<Demarche>(`/demarches/${id}`),
  
  create: (data: Omit<Demarche, 'id' | 'dateCreation' | 'dateModification'>) =>
    apiClient.post<Demarche>('/demarches', data),
  
  update: (id: number, data: Partial<Demarche>) =>
    apiClient.put<Demarche>(`/demarches/${id}`, data),
  
  delete: (id: number) => apiClient.delete(`/demarches/${id}`),
};
