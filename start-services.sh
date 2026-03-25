#!/bin/bash
# IA-DAF — Script de démarrage
# Architecture : discovery-service + api-gateway + ai-service + ollama

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
# 1. Démarrer tous les conteneurs
# --------------------------------------------------------------------------
title "📦 Démarrage des conteneurs Docker…"
docker compose up -d --build
log "Conteneurs démarrés."

# --------------------------------------------------------------------------
# 2. Attendre que discovery-service soit healthy
# --------------------------------------------------------------------------
title "⏳ Attente du Discovery Service (Eureka)…"
MAX_WAIT=120
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
# 3. Attendre que l'AI service soit healthy
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
# 4. Télécharger le modèle Mistral dans Ollama (en arrière-plan)
# --------------------------------------------------------------------------
title "🤖 Lancement du téléchargement du modèle Mistral…"
warn "Cette étape peut prendre plusieurs minutes selon votre connexion Internet."
warn "Le téléchargement s'effectue en arrière-plan. Suivez la progression avec :"
warn "  docker compose exec ollama ollama pull mistral"
docker compose exec -d ollama ollama pull mistral 2>/dev/null \
    || warn "Impossible de lancer le téléchargement. Exécutez manuellement : docker compose exec ollama ollama pull mistral"

# --------------------------------------------------------------------------
# 5. Afficher les URLs d'accès
# --------------------------------------------------------------------------
title "🌐 Services disponibles"
echo ""
echo -e "  ${GREEN}Eureka Dashboard${NC}      →  http://localhost:8761"
echo -e "  ${GREEN}API Gateway${NC}           →  http://localhost:8080"
echo -e "  ${GREEN}AI Service (direct)${NC}   →  http://localhost:8086"
echo -e "  ${GREEN}AI Docs (Swagger)${NC}     →  http://localhost:8086/docs"
echo -e "  ${GREEN}Ollama${NC}                →  http://localhost:11434"
echo ""
echo -e "  ${CYAN}Test rapide :${NC}"
echo "  curl http://localhost:8086/ai/health"
echo "  curl -X POST http://localhost:8080/api/ai/chat \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"message\": \"Comment obtenir une carte de séjour ?\"}'"
echo ""
