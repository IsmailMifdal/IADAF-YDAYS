#!/bin/bash

# Script pour redémarrer tous les services IA-DAF

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🔄 IA-DAF - Redémarrage de tous les services     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Arrêter tous les services
echo -e "${RED}🛑 Arrêt des services...${NC}"
"$BASE_DIR/stop-all-services.sh"

echo ""
echo -e "${GREEN}⏳ Attente de 5 secondes...${NC}"
sleep 5

# Redémarrer tous les services
echo ""
echo -e "${GREEN}🚀 Redémarrage des services...${NC}"
"$BASE_DIR/start-all-services.sh"
