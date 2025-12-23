import Keycloak from 'keycloak-js';

let keycloak: Keycloak | null = null;

if (typeof window !== 'undefined') {
  const keycloakConfig = {
    url: process.env.NEXT_PUBLIC_KEYCLOAK_URL!,
    realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM!,
    clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!,
  };

  keycloak = new Keycloak(keycloakConfig);
}

export default keycloak!;
