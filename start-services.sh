#!/bin/bash
# IA-DAF — Script de démarrage
# Architecture : postgres + discovery-service + api-gateway + ai-service + frontend

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${GREEN}[INFO]${NC}  $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
title() { echo -e "\n${CYAN}$1${NC}"; }

title "🚀 IA-DAF — Démarrage des services"

# --------------------------------------------------------------------------
# 0. Vérifier la configuration
# --------------------------------------------------------------------------
if [ ! -f .env ]; then
    error "Fichier .env absent. Créez-le : cp .env.example .env"
    exit 1
fi

if ! grep -qE '^AUTH_SECRET=.+' .env; then
    error "AUTH_SECRET manquant dans .env — le frontend refusera de démarrer."
    error "Générez-en un : echo \"AUTH_SECRET=\$(openssl rand -base64 32)\" >> .env"
    exit 1
fi

if ! grep -qE '^OPENAI_API_KEY=sk-' .env; then
    warn "OPENAI_API_KEY absente ou invalide — le chatbot tournera en mode dégradé."
fi

# --------------------------------------------------------------------------
# 1. Démarrer tous les conteneurs
# --------------------------------------------------------------------------
title "📦 Démarrage des conteneurs Docker…"
warn "Le premier build est long : l'AI Service installe PyTorch."
docker compose up -d --build
log "Conteneurs démarrés."

MAX_WAIT=180

# --------------------------------------------------------------------------
# 2. Attendre que discovery-service soit healthy
# --------------------------------------------------------------------------
title "⏳ Attente du Discovery Service (Eureka)…"
ELAPSED=0
until docker compose exec -T discovery-service curl -sf http://localhost:8761/actuator/health > /dev/null 2>&1; do
    if [ $ELAPSED -ge $MAX_WAIT ]; then
        error "Discovery Service non disponible après ${MAX_WAIT}s. Vérifiez : docker compose logs discovery-service"
        exit 1
    fi
    echo -n "."
    sleep 5
    ELAPSED=$((ELAPSED + 5))
done
echo ""
log "✅ Discovery Service prêt."

# --------------------------------------------------------------------------
# 3. Attendre l'AI Service
# --------------------------------------------------------------------------
title "⏳ Attente du AI Service…"
ELAPSED=0
until docker compose exec -T ai-service curl -sf http://localhost:8086/ai/health > /dev/null 2>&1; do
    if [ $ELAPSED -ge $MAX_WAIT ]; then
        warn "AI Service non disponible après ${MAX_WAIT}s. Il démarrera en arrière-plan."
        break
    fi
    echo -n "."
    sleep 5
    ELAPSED=$((ELAPSED + 5))
done
echo ""
log "✅ AI Service prêt (ou en cours de démarrage)."

# --------------------------------------------------------------------------
# 4. Attendre le frontend
# --------------------------------------------------------------------------
title "⏳ Attente du Frontend…"
ELAPSED=0
until curl -sf http://localhost:3000 > /dev/null 2>&1; do
    if [ $ELAPSED -ge $MAX_WAIT ]; then
        warn "Frontend non disponible après ${MAX_WAIT}s. Vérifiez : docker compose logs frontend"
        break
    fi
    echo -n "."
    sleep 5
    ELAPSED=$((ELAPSED + 5))
done
echo ""
log "✅ Frontend prêt."

# --------------------------------------------------------------------------
# 5. Afficher les URLs d'accès
# --------------------------------------------------------------------------
title "🌐 Services disponibles"
echo ""
echo -e "  ${GREEN}Application${NC}           →  http://localhost:3000"
echo -e "  ${GREEN}Eureka Dashboard${NC}      →  http://localhost:8761"
echo -e "  ${GREEN}API Gateway${NC}           →  http://localhost:8080"
echo -e "  ${GREEN}AI Service (direct)${NC}   →  http://localhost:8086"
echo -e "  ${GREEN}AI Docs (Swagger)${NC}     →  http://localhost:8086/docs"
echo ""
echo -e "  ${CYAN}Test rapide :${NC}"
echo "  curl http://localhost:8086/ai/health"
echo "  curl -X POST http://localhost:8080/api/ai/chat \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"message\": \"Comment obtenir une carte de séjour ?\"}'"
echo ""
echo -e "  ${CYAN}Santé globale :${NC}  bash tests/health-checks/check-all-services.sh"
echo ""
