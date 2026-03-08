#!/bin/bash

# Script pour arrêter TOUS les services IA-DAF

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Répertoires
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$BASE_DIR/pids"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🛑 IA-DAF - Arrêt de tous les services           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Fonction pour afficher un message avec timestamp
log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ❌ ERREUR:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️ ${NC} $1"
}

# Fonction pour arrêter un service
stop_service() {
    local service_name=$1
    local pid_file="$PID_DIR/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            log "Arrêt de $service_name (PID: $pid)..."
            kill -15 $pid 2>/dev/null || true
            
            # Attendre que le processus se termine
            local count=0
            while [ $count -lt 10 ] && ps -p $pid > /dev/null 2>&1; do
                sleep 1
                count=$((count + 1))
            done
            
            # Forcer l'arrêt si nécessaire
            if ps -p $pid > /dev/null 2>&1; then
                warn "$service_name ne répond pas, arrêt forcé..."
                kill -9 $pid 2>/dev/null || true
            fi
            
            log "✅ $service_name arrêté"
        else
            warn "$service_name n'est pas en cours d'exécution (PID obsolète)"
        fi
        rm -f "$pid_file"
    else
        warn "$service_name - pas de fichier PID trouvé"
    fi
}

# Vérifier si le répertoire PID existe
if [ ! -d "$PID_DIR" ]; then
    warn "Aucun répertoire PID trouvé. Les services ne sont probablement pas en cours d'exécution."
    exit 0
fi

# Arrêter les services dans l'ordre inverse du démarrage
echo "🛑 Arrêt des services..."
echo ""

# Services métier
stop_service "ai-service"
stop_service "analytics-service"
stop_service "document-service"
stop_service "demarches-service"
stop_service "user-service"

# API Gateway
stop_service "api-gateway"

# Discovery Service (en dernier)
stop_service "discovery-service"

echo ""
log "✅ Tous les services ont été arrêtés"
echo ""

# Nettoyer les fichiers PID restants
if [ -d "$PID_DIR" ]; then
    rm -f "$PID_DIR"/*.pid 2>/dev/null || true
fi

echo "💡 Les logs sont toujours disponibles dans le dossier 'logs/'"
echo "   Pour les consulter: tail -f logs/<service-name>.log"
echo ""
