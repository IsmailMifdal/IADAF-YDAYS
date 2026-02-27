import apiClient from './client';

export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  languePreferee: string;
  paysOrigine?: string;
  villeResidence?: string;
}

export const usersApi = {
  getProfile: () => apiClient.get<User>('/users/me'),
  
  updateProfile: (data: Partial<User>) => 
    apiClient.put<User>('/users/me', data),
  
  getAllUsers: () => 
    apiClient.get<User[]>('/users'),
};
