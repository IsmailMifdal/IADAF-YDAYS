#!/bin/bash

# Script pour démarrer TOUS les services IA-DAF en arrière-plan
# Ce script démarre les services dans le bon ordre et attend qu'ils soient prêts

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Répertoire de base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$BASE_DIR/logs"
PID_DIR="$BASE_DIR/pids"

# Créer les répertoires pour les logs et PIDs
mkdir -p "$LOG_DIR"
mkdir -p "$PID_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🚀 IA-DAF - Démarrage de tous les services       ║${NC}"
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
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  ATTENTION:${NC} $1"
}

# Fonction pour vérifier si un service est déjà en cours d'exécution
is_running() {
    local service_name=$1
    local pid_file="$PID_DIR/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            return 0  # En cours d'exécution
        else
            rm -f "$pid_file"
        fi
    fi
    return 1  # Pas en cours d'exécution
}

# Fonction pour arrêter un service s'il est en cours d'exécution
stop_if_running() {
    local service_name=$1
    if is_running "$service_name"; then
        local pid=$(cat "$PID_DIR/${service_name}.pid")
        warn "$service_name est déjà en cours d'exécution (PID: $pid). Arrêt..."
        kill -15 $pid 2>/dev/null || true
        sleep 2
        if ps -p $pid > /dev/null 2>&1; then
            kill -9 $pid 2>/dev/null || true
        fi
        rm -f "$PID_DIR/${service_name}.pid"
        sleep 1
    fi
}

# Fonction pour démarrer un service
start_service() {
    local service_name=$1
    local service_dir=$2
    local port=$3
    local wait_time=${4:-30}
    
    log "Démarrage de $service_name..."
    
    # Arrêter si déjà en cours d'exécution
    stop_if_running "$service_name"
    
    # Démarrer le service en arrière-plan
    cd "$BASE_DIR/$service_dir"
    nohup mvn spring-boot:run > "$LOG_DIR/${service_name}.log" 2>&1 &
    local pid=$!
    echo $pid > "$PID_DIR/${service_name}.pid"
    
    log "$service_name démarré (PID: $pid)"
    
    # Attendre que le service soit prêt
    log "Attente du démarrage de $service_name (max ${wait_time}s)..."
    local count=0
    while [ $count -lt $wait_time ]; do
        if grep -q "Started.*Application" "$LOG_DIR/${service_name}.log" 2>/dev/null; then
            log "✅ $service_name est prêt!"
            return 0
        fi
        
        # Vérifier si le processus s'est terminé avec une erreur
        if ! ps -p $pid > /dev/null 2>&1; then
            error "$service_name s'est arrêté de manière inattendue!"
            error "Consultez les logs: tail -f $LOG_DIR/${service_name}.log"
            return 1
        fi
        
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    echo ""
    
    warn "$service_name n'a pas démarré dans le délai imparti"
    warn "Le service continue à démarrer en arrière-plan..."
    warn "Consultez les logs: tail -f $LOG_DIR/${service_name}.log"
    return 0
}

# Fonction pour vérifier qu'un port est libre
check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        error "Le port $port est déjà utilisé (nécessaire pour $service)"
        error "Exécutez: lsof -i :$port pour identifier le processus"
        error "Puis: kill -9 <PID> pour le terminer"
        return 1
    fi
    return 0
}

# ============================================
# ÉTAPE 1: Vérifications préliminaires
# ============================================

echo ""
log "🔍 Vérifications préliminaires..."

# Vérifier Java
if ! command -v java &> /dev/null; then
    error "Java n'est pas installé. Installez Java 17+"
    exit 1
fi
log "✅ Java trouvé: $(java -version 2>&1 | head -n 1)"

# Vérifier Maven
if ! command -v mvn &> /dev/null; then
    error "Maven n'est pas installé. Installez Maven 3.8+"
    exit 1
fi
log "✅ Maven trouvé: $(mvn -version 2>&1 | head -n 1)"

# Vérifier le fichier .env
if [ ! -f "$BASE_DIR/.env" ]; then
    warn "Fichier .env introuvable. Création depuis .env.example..."
    if [ -f "$BASE_DIR/.env.example" ]; then
        cp "$BASE_DIR/.env.example" "$BASE_DIR/.env"
        log "✅ Fichier .env créé"
    else
        error "Fichier .env.example introuvable!"
        exit 1
    fi
fi

# Charger les variables d'environnement
log "Chargement des variables d'environnement..."
set -a
source "$BASE_DIR/.env"
set +a
log "✅ Variables d'environnement chargées"

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    error "Docker n'est pas installé"
    exit 1
fi

# Vérifier que PostgreSQL est en cours d'exécution
log "Vérification de PostgreSQL..."
if ! docker ps | grep -q iadaf-postgres; then
    warn "PostgreSQL n'est pas en cours d'exécution"
    log "Démarrage de Docker Compose..."
    cd "$BASE_DIR"
    docker compose up -d
    log "Attente de PostgreSQL (30 secondes)..."
    sleep 30
fi
log "✅ PostgreSQL est en cours d'exécution"

# Vérifier que Keycloak est en cours d'exécution
log "Vérification de Keycloak..."
if ! docker ps | grep -q iadaf-keycloak; then
    warn "Keycloak n'est pas en cours d'exécution"
    log "Démarrage de Docker Compose..."
    cd "$BASE_DIR"
    docker compose up -d
    log "Attente de Keycloak (60 secondes)..."
    sleep 60
fi
log "✅ Keycloak est en cours d'exécution"

# ============================================
# ÉTAPE 2: Vérifier que les ports sont libres
# ============================================

echo ""
log "🔍 Vérification des ports..."

check_port 8761 "Discovery Service" || exit 1
check_port 8080 "API Gateway" || exit 1
check_port 8081 "User Service" || exit 1
check_port 8082 "Demarches Service" || exit 1
check_port 8083 "Document Service" || exit 1
check_port 8085 "Analytics Service" || exit 1
check_port 8086 "AI Service" || exit 1

log "✅ Tous les ports sont disponibles"

# ============================================
# ÉTAPE 3: Compiler tous les services
# ============================================

echo ""
log "🔨 Compilation de tous les services..."
cd "$BASE_DIR"
if mvn clean install -DskipTests > "$LOG_DIR/compile.log" 2>&1; then
    log "✅ Compilation réussie"
else
    error "Échec de la compilation"
    error "Consultez les logs: tail -f $LOG_DIR/compile.log"
    exit 1
fi

# ============================================
# ÉTAPE 4: Démarrer les services
# ============================================

echo ""
log "🚀 Démarrage des services dans l'ordre..."
echo ""

# 1. Discovery Service (Eureka) - DOIT démarrer en premier
start_service "discovery-service" "discovery-service" "8761" 60 || exit 1

# Attente supplémentaire pour que Eureka soit complètement prêt
log "Attente de la stabilisation d'Eureka (10 secondes)..."
sleep 10

# 2. API Gateway
start_service "api-gateway" "api-gateway" "8080" 60 || exit 1

# 3. Services métier (peuvent démarrer en parallèle)
start_service "user-service" "user-service" "8081" 60 &
start_service "demarches-service" "demarches-service" "8082" 60 &
start_service "document-service" "document-service" "8083" 60 &
start_service "analytics-service" "analytics-service" "8085" 60 &
start_service "ai-service" "ai-service" "8086" 60 &

# Attendre que tous les services en parallèle soient démarrés
wait

# ============================================
# ÉTAPE 5: Vérifications finales
# ============================================

echo ""
log "🔍 Vérifications finales..."

# Attendre un peu pour que les services s'enregistrent dans Eureka
sleep 10

# Vérifier Eureka
if curl -s http://localhost:8761 > /dev/null; then
    log "✅ Eureka Dashboard accessible: http://localhost:8761"
else
    warn "Eureka Dashboard non accessible"
fi

# Vérifier API Gateway
if curl -s http://localhost:8080/actuator/health > /dev/null 2>&1; then
    log "✅ API Gateway accessible: http://localhost:8080"
else
    warn "API Gateway non accessible"
fi

# ============================================
# FIN
# ============================================

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Tous les services sont démarrés!               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "📊 Services en cours d'exécution:"
echo "  - Discovery Service (Eureka): http://localhost:8761"
echo "  - API Gateway:                http://localhost:8080"
echo "  - User Service:               http://localhost:8081"
echo "  - Demarches Service:          http://localhost:8082"
echo "  - Document Service:           http://localhost:8083"
echo "  - Analytics Service:          http://localhost:8085"
echo "  - AI Service:                 http://localhost:8086"
echo ""
echo "📋 Commandes utiles:"
echo "  - Voir les logs d'un service:  tail -f logs/<service-name>.log"
echo "  - Arrêter tous les services:   ./stop-all-services.sh"
echo "  - Voir le statut des services: ./status-services.sh"
echo ""
echo "🔍 Consultez Eureka pour voir les services enregistrés:"
echo "   http://localhost:8761"
echo ""
