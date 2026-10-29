# Mise en production — IA-DAF

Runbook pas à pas : du VPS vierge au site en HTTPS, puis l'exploitation
(sauvegardes, mises à jour, retour arrière, restauration après sinistre).

```
Internet ──443──▶ Caddy (HTTPS, en-têtes) ──▶ frontend:3000 ──▶ api-gateway ──▶ services
                  seul conteneur publié         réseau Docker interne uniquement
```

Fichiers concernés :

| Fichier | Rôle |
|---|---|
| `docker-compose.yml` | La stack (commune au développement et à la production) |
| `docker-compose.prod.yml` | Surcouche de production : Caddy, images GHCR, limites mémoire, logs plafonnés, secrets exigés |
| `deploy/Caddyfile` | HTTPS automatique (Let's Encrypt), en-têtes de sécurité, taille des requêtes |
| `deploy/generate-secrets.sh` | Crée le `.env` de production, secrets tirés au hasard |
| `deploy/backup.sh` | Sauvegarde chiffrée de la base, rotation, copie hors serveur |
| `deploy/restore-test.sh` | Restaure une sauvegarde dans une base jetable et la contrôle |
| `deploy/smoke-test.sh` | Contrôle le site de l'extérieur : HTTPS, en-têtes, santé, limites, webhook |
| `deploy/deploy.sh` | Déploie le commit extrait : images, sauvegarde, démarrage, contrôle (étape 8) |
| `deploy/caddy.d/` | Réglages Caddy propres à un serveur, non versionnés : l'accès restreint de la recette |
| `.github/workflows/deploy.yml` | Recette après chaque CI verte sur `main`, production sur une version `vX.Y.Z` approuvée |
| `deploy/replay-erasures.sh` | Après une restauration, supprime de nouveau les comptes supprimés depuis la sauvegarde |
| `docker/postgres/provision.sql` | Un compte PostgreSQL par service, limité à son schéma (rejoué à chaque démarrage) |

---

## 1. Choisir l'hébergement

| | Recommandé |
|---|---|
| Serveur | VPS **4 vCPU, 8 Go de RAM, 80 Go SSD**, Ubuntu 24.04 LTS, **hébergé dans l'UE** |
| Fournisseur | **Scaleway** (France) : VPS, envoi d'e-mails (Transactional Email) et stockage objet (sauvegardes) chez un seul fournisseur européen, donc un seul DPA à signer. OVHcloud est l'alternative équivalente. |
| Domaine | Enregistrements DNS `A` (et `AAAA` si IPv6) vers l'IP du VPS |

8 Go suffisent : les limites mémoire de `docker-compose.prod.yml` totalisent
environ 6,5 Go (6 JVM à 384–512 Mo, AI Service 2 Go, PostgreSQL 1 Go), le
reste est laissé au système. En dessous de 8 Go, la stack ne tient pas.

---

## 2. Préparer le serveur

En `root`, une seule fois :

```bash
# Utilisateur d'exploitation, connexion SSH par clé uniquement
adduser --disabled-password --gecos "" deploy
mkdir -p /home/deploy/.ssh && cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
# Fichier lu avant 50-cloud-init.conf, qui réactive souvent les mots de passe
cat > /etc/ssh/sshd_config.d/10-iadaf.conf <<'EOF'
PasswordAuthentication no
PermitRootLogin no
EOF
sshd -t && systemctl restart ssh   # garder la session ouverte et tester une 2e connexion

# Correctifs de sécurité automatiques
apt update && apt full-upgrade -y
apt install -y unattended-upgrades gnupg rclone git curl
dpkg-reconfigure -f noninteractive unattended-upgrades

# Pare-feu : SSH, HTTP (redirection + validation Let's Encrypt), HTTPS (+ HTTP/3)
ufw default deny incoming && ufw default allow outgoing
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp
ufw enable

# Docker Engine + plugin Compose, depuis le dépôt apt officiel de Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt update && apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker deploy   # le groupe docker équivaut à root : réserver ce compte à l'exploitation

# Dossier des sauvegardes locales
install -d -o deploy -g deploy -m 700 /var/backups/iadaf
```

> **Docker contourne ufw** pour les ports qu'il publie. Ce n'est sûr que parce
> que la surcouche de production ne publie que 80 et 443 : ne jamais lancer
> la stack sur le serveur sans elle (voir `COMPOSE_FILE` à l'étape 3).

---

## 3. Installer IA-DAF

En `deploy` :

```bash
sudo install -d -o deploy -g deploy /opt/iadaf
git clone https://github.com/<owner>/IADAF-YDAYS.git /opt/iadaf
cd /opt/iadaf
git checkout <sha>            # le commit de main dont les images ont été publiées

deploy/generate-secrets.sh    # crée .env (droits 600), ne remplace jamais un .env existant
nano .env                     # remplir les valeurs vides, voir ci-dessous
```

Le `.env` généré fixe `COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml` :
sur le serveur, `docker compose` charge toujours la surcouche de production,
jamais l'override de développement.

| Variable | Valeur |
|---|---|
| `DOMAIN` | `iadaf.fr` (sans `https://`) |
| `ACME_EMAIL` | Adresse qui reçoit les alertes Let's Encrypt |
| `GHCR_OWNER` | Propriétaire du dépôt GitHub, en minuscules |
| `IMAGE_TAG` | SHA complet du commit déployé (le même qu'au `git checkout`) |
| `OPENAI_API_KEY` | Clé **dédiée à la production** (ou une clé Mistral, voir `.env.example`) |
| `STRIPE_SECRET_KEY` | `sk_live_…` (étape 5) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` (étape 5) |
| `SMTP_URL`, `MAIL_FROM` | Fournisseur SMTP, ex. `smtps://<utilisateur>:<mot-de-passe>@<serveur-smtp>:465` |

**Avant d'aller plus loin**, copier `DOCUMENT_ENCRYPTION_KEY` et
`BACKUP_PASSPHRASE` dans un coffre hors du serveur (gestionnaire de mots de
passe de l'équipe). Sans la première, les pièces stockées sont définitivement
illisibles ; sans la seconde, les sauvegardes aussi.

---

## 4. Premier démarrage

Les images sont construites, testées et scannées par la CI à chaque push sur
`main`, puis publiées sur GHCR (`ghcr.io/<owner>/iadaf-<service>:<sha>`).
Rien n'est compilé sur le serveur.

```bash
# Paquets GHCR privés : jeton GitHub (classic) avec le seul droit read:packages
echo "<jeton>" | docker login ghcr.io -u <utilisateur-github> --password-stdin

docker compose pull
docker compose up -d --wait   # ~6 min la 1re fois (6 JVM + ~450 Mo de modèles, gardés ensuite en volume)

docker compose ps                         # tout doit être « healthy »
```

Puis, depuis le serveur ou un poste quelconque :

```bash
deploy/smoke-test.sh <DOMAIN>     # 14 contrôles ; le webhook Stripe en 503 = clés absentes
```

Les premières requêtes après un démarrage sont lentes (JVM à froid, jusqu'à
une minute) : déployer aux heures creuses.

Si un service reste `unhealthy` : `docker compose logs --tail=200 <service>`.
Un message `… is required` au lancement signale une variable vide dans `.env`.

---

## 5. Brancher les services externes

**Stripe (paiement)** — tableau de bord Stripe, mode *live* :

1. Développeurs → Webhooks → *Ajouter une destination* :
   URL `https://<DOMAIN>/api/stripe/webhook`, événement **`checkout.session.completed`**.
2. Copier le secret de signature dans `STRIPE_WEBHOOK_SECRET`, la clé secrète
   live dans `STRIPE_SECRET_KEY`, puis `docker compose up -d frontend`.
3. Faire un achat réel, vérifier que le pack s'ouvre, puis le rembourser.

**Google (connexion, facultatif)** — Google Cloud Console : URI de
redirection `https://<DOMAIN>/api/auth/callback/google`.

**LLM** — fixer un **plafond de dépense mensuel** sur le compte (OpenAI :
Settings → Limits). La limitation de débit borne les abus, pas la facture.

**E-mail** — demander une réinitialisation de mot de passe et vérifier que
le message arrive (et pas en spam : SPF et DKIM du domaine d'envoi configurés
chez le fournisseur SMTP).

---

## 6. Sauvegardes

`deploy/backup.sh` sauvegarde toute la base (comptes, dossiers, pièces,
conversations, registre des ventes), chiffrée par `BACKUP_PASSPHRASE`. Les
pièces y restent en plus chiffrées par `DOCUMENT_ENCRYPTION_KEY`, qui n'est
pas dans la sauvegarde.

**Copie hors serveur** (une sauvegarde sur le serveur qu'elle protège n'en est
pas une) : créer un bucket de stockage objet en UE avec une règle de cycle de
vie qui supprime les objets après 14 jours, déclarer le remote avec
`rclone config` (type S3), puis dans `.env` :
`BACKUP_RCLONE_REMOTE=<remote>:<bucket>`.

**Planification** — `crontab -e` en `deploy` :

```cron
# Chaque nuit à 3 h 15 ; la sonde n'est appelée que si la sauvegarde a réussi.
15 3 * * * /opt/iadaf/deploy/backup.sh >> /var/log/iadaf/backup.log 2>&1 && curl -fsS -m 10 --retry 3 <URL-sonde-sauvegarde>
# Le 1er du mois à 4 h 30 : restauration de la dernière sauvegarde dans une base jetable.
30 4 1 * * /opt/iadaf/deploy/restore-test.sh >> /var/log/iadaf/restore-test.log 2>&1 && curl -fsS -m 10 --retry 3 <URL-sonde-restauration>
```

(`sudo install -d -o deploy /var/log/iadaf` avant.) Les URL de sonde viennent
d'un service de surveillance de tâches planifiées (*heartbeat*, par exemple
Healthchecks.io) : il alerte quand le signal **n'arrive pas**, ce qui couvre
aussi un cron arrêté ou un serveur éteint.

Les copies locales sont supprimées après `BACKUP_RETENTION_DAYS` (14 jours) :
un compte effacé disparaît des sauvegardes à cette échéance (RGPD).

Ne sont pas sauvegardés, car reconstruits seuls : le cache des certificats
(`caddy_data`), l'index de la base de connaissances (`ai_vectorstore`, réindexé
dès que les fiches changent) et les modèles téléchargés (`ai_model_cache`).

---

## 7. Supervision

| Quoi | Comment |
|---|---|
| Disponibilité | Sonde externe sur `https://<DOMAIN>/api/health` chaque minute (200 = le site et la base répondent) |
| Logs | `docker compose logs -f --tail=200 <service>` — plafonnés à 5 × 10 Mo par conteneur |
| Disque | Alerte à 80 % (la base grossit avec les pièces déposées) : `df -h /var/lib/docker` |
| Certificats | Renouvelés par Caddy ; Let's Encrypt écrit à `ACME_EMAIL` en cas de problème |
| Vulnérabilités | La CI scanne les images ; redéployer après chaque correctif publié sur `main` |

**Test de charge, avant l'ouverture** (et après un changement de serveur) :
il valide les limites mémoire sur le vrai VPS. Créer un compte de test depuis
le site, puis, aux heures creuses :

```bash
docker run --rm -i --network iadaf_iadaf-network grafana/k6:2.3.0 run \
  -e BASE_URL=http://frontend:3000 -e LOAD_EMAIL=<compte de test> -e LOAD_PASSWORD=<mot de passe> \
  - < tests/load/load-test.js
# en parallèle, dans un autre terminal :
docker stats --no-stream --format '{{.Name}} {{.MemUsage}}'
```

Réussi si k6 termine sans seuil franchi (moins de 1 % d'erreurs, p95 sous
1,5 s pour les pages et 0,5 s pour l'API) et si aucun conteneur n'approche
sa limite mémoire ni ne redémarre (`docker compose ps`). Supprimer ensuite le
compte de test. Valeurs par défaut : 20 visiteurs et 10 utilisateurs connectés
simultanés pendant 3 minutes (`LOAD_VISITORS`, `LOAD_MEMBERS`,
`LOAD_DURATION`). L'assistant n'est pas sollicité : chaque réponse est
facturée.

---

## 8. Environnements, versions et mises à jour

Trois environnements, une seule branche (`main`) : décidé dans l'issue #70.

| Environnement | Où | Ce qui y arrive | Données et clés |
|---|---|---|---|
| `local` | Le poste de chaque développeur | `docker compose up -d --build --wait` | Données de test, Mailpit, Stripe en mode test |
| `staging` (la recette) | **Un serveur à part**, `recette.<domaine>` | Chaque commit de `main` dont la CI est verte, automatiquement | Données fictives, Stripe en mode test, clé d'IA dédiée à plafond bas, accès par mot de passe |
| `prod` | Le serveur de production | Une version `vX.Y.Z`, après l'approbation du porteur | Vraies données, Stripe en mode réel |

La recette ne partage pas le serveur de production : la stack demande à elle seule
les 8 Go du serveur (étape 1). Elle tourne sur les **mêmes images** que la
production : ce qui marche en recette marchera en production.

### Le circuit

1. Une PR est fusionnée dans `main`. La CI teste, construit et publie les images
   (`ghcr.io/<owner>/iadaf-<service>:<sha>`), puis le workflow **Deploy** met la
   recette à jour.
2. Une fois la recette vérifiée, le porteur crée la version, sur ce commit de `main` :

   ```bash
   git fetch origin && git checkout <sha-validé-en-recette>
   git tag -a v1.2.0 -m "v1.2.0"
   git push origin v1.2.0
   ```

   Seuls les administrateurs du dépôt peuvent créer, déplacer ou supprimer une
   étiquette `v*` (règle du dépôt). Le workflow **Deploy** attend alors
   l'approbation (Actions → Deploy → *Review deployments*), étiquette les images
   `v1.2.0`, déploie, puis publie les notes de version.
3. Numérotation `vMAJEUR.MINEUR.CORRECTIF` : CORRECTIF pour une correction,
   MINEUR pour une fonctionnalité, MAJEUR pour un changement qui casse un
   client (l'API de l'application mobile, par exemple). Pas de suffixe
   (`-rc.1`…) : la recette joue ce rôle, et la production refuse ces étiquettes.

Sur le serveur, chaque déploiement passe par `deploy/deploy.sh`, qui déploie le
commit extrait : images de ce commit (rien ne change si elles n'existent pas),
sauvegarde, démarrage, contrôle de l'extérieur. À la main :

```bash
cd /opt/iadaf
git fetch --tags origin && git checkout <sha-ou-version>
deploy/deploy.sh
```

**Retour arrière** : Actions → Deploy → *Run workflow*, en choisissant la version
précédente (« Use workflow from ») et l'environnement ; ou, sur le serveur, les
commandes ci-dessus avec la version précédente. Les migrations de base (Flyway,
Alembic) ne s'annulent pas : si la version retirée avait modifié le schéma,
l'ancienne refusera de démarrer. Restaurer alors la sauvegarde prise juste avant
la mise à jour (étape 9).

### Brancher un serveur sur le déploiement automatique

Pour chaque serveur (recette, puis production), après les étapes 2 à 4 :

1. **Une clé SSH réservée à la CI**, sur ton poste :

   ```bash
   ssh-keygen -t ed25519 -N "" -C "github-actions staging" -f iadaf-deploy-staging
   ssh-keyscan -t ed25519 <ip-du-serveur>      # → DEPLOY_KNOWN_HOSTS
   ```

   Sur le serveur, en `deploy`, ajouter la clé publique dans
   `~/.ssh/authorized_keys`, précédée de `restrict ` (ni terminal, ni redirection
   de ports). Ranger la clé privée dans le coffre de l'équipe, puis la supprimer
   du poste.
2. **GitHub → Settings → Environments** (`staging` ou `prod`, déjà créés) :
   - variables : `DEPLOY_HOST` (IP ou nom du serveur), `DOMAIN` ; `DEPLOY_USER`
     et `DEPLOY_PATH` seulement s'ils diffèrent de `deploy` et `/opt/iadaf` ;
   - secrets : `DEPLOY_SSH_KEY` (la clé privée), `DEPLOY_KNOWN_HOSTS`.

   Tant que `DEPLOY_HOST` est vide, le workflow l'indique et ne fait rien.
   `staging` accepte `main` et les versions ; `prod` n'accepte que les versions,
   et attend l'approbation du porteur.

**Particularités de la recette**, dans son `.env` :

| Variable | Valeur |
|---|---|
| `DOMAIN` | `recette.<domaine>` (enregistrement DNS `A` vers le serveur de recette) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Clés du **mode test**, webhook déclaré en mode test vers `https://recette.<domaine>/api/stripe/webhook` |
| `OPENAI_API_KEY` | Clé dédiée à la recette, avec un plafond de dépenses bas chez le fournisseur |
| `MAIL_FROM` | Une adresse de recette (`recette@<domaine>`) |
| `DEPLOY_BACKUP` | `0` : données fictives, pas de sauvegarde avant chaque déploiement |
| `SMOKE_BASIC_AUTH` | `equipe:<mot-de-passe>`, le mot de passe de l'accès restreint |

Puis l'accès restreint : copier `deploy/caddy.d/staging.caddy.example` en
`deploy/caddy.d/staging.caddy` et y mettre le hash du mot de passe (voir le
fichier). Le mot de passe se partage avec l'équipe et les testeurs par le coffre,
jamais dans une issue ou sur Discord.

---

## 9. Restaurer après un sinistre

Sur le serveur d'origine ou un nouveau, avec **le même `.env`** (même
`DOCUMENT_ENCRYPTION_KEY`, sinon les pièces restaurées sont illisibles) :

```bash
cd /opt/iadaf
docker compose up -d postgres --wait

# Comptes supprimés depuis la sauvegarde : la restauration va les ramener.
# Base encore en service → son journal, le plus récent :
deploy/replay-erasures.sh export > /var/backups/iadaf/erasures.csv
# Base perdue → celui de la sauvegarde la plus récente :
#   deploy/replay-erasures.sh export-from <dernière>.dump.gpg > /var/backups/iadaf/erasures.csv

# Les comptes par service doivent exister avant la restauration, qui leur
# rend la propriété de leurs tables (sur un serveur neuf, ils n'existent pas).
docker compose run --rm db-provision
docker compose stop $(docker compose config --services | grep -v '^postgres$')

# Déchiffrer d'abord dans un fichier : gpg vérifie l'intégrité et échoue si
# la sauvegarde a été altérée — ne rien restaurer dans ce cas.
gpg --batch --pinentry-mode loopback --decrypt --output /tmp/restore.dump <sauvegarde>.dump.gpg

docker exec iadaf-postgres dropdb -U iadaf_user --if-exists iadaf_db
docker exec iadaf-postgres createdb -U iadaf_user iadaf_db
docker exec -i iadaf-postgres pg_restore -U iadaf_user -d iadaf_db --exit-on-error < /tmp/restore.dump
shred -u /tmp/restore.dump

docker compose up -d --wait

# Supprimer de nouveau les comptes revenus avec la sauvegarde (sans effet sur
# ceux qui n'existent plus ; rejouer est sans risque).
deploy/replay-erasures.sh replay /var/backups/iadaf/erasures.csv
```

Seules les suppressions postérieures à la dernière sauvegarde sont perdues si
le serveur entier l'est : elles sont alors à refaire à la main.

---

## 10. Avant d'ouvrir au public

- [ ] `front/src/app/lib/legalInfo.ts` rempli (éditeur, hébergeur, médiateur) : mentions légales, CGV et politique de confidentialité complètes
- [ ] DPA archivés : hébergeur, SMTP, stockage des sauvegardes, Stripe, fournisseur LLM (`docs/rgpd/sous-traitants.md`)
- [ ] `DOCUMENT_ANALYSIS_ENABLED=false` tant que l'AIPD n'est pas menée (`docs/rgpd/aipd-preparation.md`)
- [ ] Achat réel puis remboursement, e-mail de réinitialisation reçu, suppression de compte testée
- [ ] Première sauvegarde faite **et** `deploy/restore-test.sh` passé
- [ ] `DOCUMENT_ENCRYPTION_KEY`, `BACKUP_PASSPHRASE` et `.env` copiés dans le coffre
- [ ] Sondes de disponibilité et de sauvegarde actives
- [ ] GitHub → Settings → Actions → General : « Allow GitHub Actions to create and approve pull requests », pour la mise à jour hebdomadaire des fiches officielles (`kb-sync.yml`) ; relire et fusionner ces pull requests, puis redéployer
- [ ] Ancienne table `public.lead_emails` supprimée si elle existe (données migrées vers `users.lead_emails`)

---

## Limites connues

- **Comptes supprimés après la dernière sauvegarde, serveur perdu** : le
  journal des suppressions vit dans la base ; si le serveur entier est perdu,
  les suppressions faites depuis la dernière sauvegarde (24 h au plus) ne
  peuvent pas être rejouées et sont à refaire à la main.
- **Un seul serveur** : pas de haute disponibilité. Le temps de reprise est
  celui de l'étape 9 (environ 15 minutes plus le démarrage de la stack).
