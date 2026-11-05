# Réglages Caddy propres à un serveur

Le `Caddyfile` importe ici tous les fichiers `*.caddy`, à l'intérieur du bloc du
site. Ces fichiers ne sont pas versionnés (`.gitignore`) : chaque serveur garde
les siens, et un `git checkout` ne les touche pas.

- **Production** : aucun fichier.
- **Recette** : copier `staging.caddy.example` en `staging.caddy`, puis remplacer
  le hash du mot de passe (voir l'exemple). Après chaque modification :
  `docker compose restart caddy`.

Voir DEPLOYMENT.md § 8.
