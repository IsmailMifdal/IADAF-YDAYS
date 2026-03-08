#!/bin/bash

# Script pour vérifier le statut de tous les services IA-DAF

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Répertoires
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$BASE_DIR/pids"
LOG_DIR="$BASE_DIR/logs"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     📊 IA-DAF - Statut des services                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Fonction pour vérifier le statut d'un service
check_service() {
    local service_name=$1
    local port=$2
    local pid_file="$PID_DIR/${service_name}.pid"
    
    echo -n "  $service_name (port $port): "
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            # Vérifier si le port est ouvert
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                echo -e "${GREEN}✅ EN COURS${NC} (PID: $pid)"
                return 0
            else
                echo -e "${YELLOW}⚠️  DÉMARRAGE${NC} (PID: $pid, port pas encore ouvert)"
                return 1
            fi
        else
            echo -e "${RED}❌ ARRÊTÉ${NC} (PID obsolète: $pid)"
            rm -f "$pid_file"
            return 2
        fi
    else
        echo -e "${RED}❌ ARRÊTÉ${NC}"
        return 2
    fi
}

# Fonction pour vérifier un service Docker
check_docker_service() {
    local service_name=$1
    local container_name=$2
    
    echo -n "  $service_name: "
    
    if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        local status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "unknown")
        if [ "$status" = "healthy" ]; then
            echo -e "${GREEN}✅ HEALTHY${NC}"
        elif [ "$status" = "starting" ]; then
            echo -e "${YELLOW}⚠️  STARTING${NC}"
        elif [ "$status" = "unhealthy" ]; then
            echo -e "${RED}❌ UNHEALTHY${NC}"
        else
            echo -e "${GREEN}✅ RUNNING${NC}"
        fi
        return 0
    else
        echo -e "${RED}❌ ARRÊTÉ${NC}"
        return 1
    fi
}

# Vérifier les services Docker
echo "🐳 Services Docker:"
check_docker_service "PostgreSQL" "iadaf-postgres"
check_docker_service "Keycloak" "iadaf-keycloak"
check_docker_service "pgAdmin" "iadaf-pgadmin"
echo ""

# Vérifier les microservices
echo "🚀 Microservices:"
check_service "discovery-service" "8761"
check_service "api-gateway" "8080"
check_service "user-service" "8081"
check_service "demarches-service" "8082"
check_service "document-service" "8083"
check_service "analytics-service" "8085"
check_service "ai-service" "8086"
echo ""

# URLs utiles
echo "🔗 URLs d'accès:"
echo "  - Eureka Dashboard:  http://localhost:8761"
echo "  - API Gateway:       http://localhost:8080"
echo "  - Keycloak Admin:    http://localhost:8180"
echo "  - pgAdmin:           http://localhost:5050"
echo ""

# Vérifier Eureka
echo "🔍 Vérification Eureka..."
if curl -s http://localhost:8761/eureka/apps 2>/dev/null | grep -q "application"; then
    echo -e "  ${GREEN}✅ Eureka répond${NC}"
    
    # Compter les services enregistrés
    local registered=$(curl -s http://localhost:8761/eureka/apps 2>/dev/null | grep -o "<application>" | wc -l)
    echo "  📊 Services enregistrés dans Eureka: $registered"
    
    # Lister les services
    echo ""
    echo "  Services enregistrés:"
    curl -s http://localhost:8761/eureka/apps 2>/dev/null | grep -o "<name>[^<]*</name>" | sed 's/<name>//;s/<\/name>//' | while read name; do
        echo "    - $name"
    done
else
    echo -e "  ${RED}❌ Eureka ne répond pas${NC}"
fi
echo ""

# Suggestions
echo "💡 Commandes utiles:"
if [ ! -d "$PID_DIR" ] || [ -z "$(ls -A $PID_DIR 2>/dev/null)" ]; then
    echo "  - Démarrer tous les services:  ./start-all-services.sh"
else
    echo "  - Arrêter tous les services:   ./stop-all-services.sh"
    echo "  - Redémarrer tous les services: ./stop-all-services.sh && ./start-all-services.sh"
fi

if [ -d "$LOG_DIR" ] && [ -n "$(ls -A $LOG_DIR 2>/dev/null)" ]; then
    echo "  - Consulter les logs:          tail -f logs/<service-name>.log"
    echo "  - Dernières erreurs:           grep -i error logs/*.log | tail -20"
fi
echo ""
