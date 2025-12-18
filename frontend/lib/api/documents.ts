import apiClient from './client';

export interface Document {
  id: number;
  nom: string;
  type: string;
  taille: number;
  url: string;
  dateUpload: string;
}

export const documentsApi = {
  getAll: () => apiClient.get<Document[]>('/documents'),
  
  getById: (id: number) => apiClient.get<Document>(`/documents/${id}`),
  
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<Document>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  delete: (id: number) => apiClient.delete(`/documents/${id}`),
  
  download: (id: number) => apiClient.get(`/documents/${id}/download`, {
    responseType: 'blob',
  }),
};
