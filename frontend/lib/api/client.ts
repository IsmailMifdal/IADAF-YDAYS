import axios from 'axios';
import keycloak from '../auth/keycloak';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT
apiClient.interceptors.request.use(
  (config) => {
    if (keycloak && keycloak.token) {
      config.headers.Authorization = `Bearer ${keycloak.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && keycloak) {
      // Token expiré, tenter de le rafraîchir
      try {
        await keycloak.updateToken(30);
        // Retenter la requête avec le nouveau token
        error.config.headers.Authorization = `Bearer ${keycloak.token}`;
        return apiClient.request(error.config);
      } catch (refreshError) {
        // Échec du refresh, déconnecter l'utilisateur
        if (keycloak) {
          keycloak.logout();
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
