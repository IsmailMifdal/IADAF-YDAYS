Les consignes complètes sont dans `AGENTS.md`, à la racine du dépôt.

La relecture de code de Copilot ne lit que ce fichier ; en relisant une PR, vérifie
en priorité :

- aucun secret, et aucune donnée personnelle réelle, dans le diff ;
- aucune migration Flyway déjà fusionnée modifiée ;
- un test pour chaque fonctionnalité ou correction ;
- pas de `any` en TypeScript, pas d'appel bloquant dans une fonction `async` ;
- les textes du front présents dans les 4 langues (fr, en, ar, es).

Rédige tes commentaires en français.
