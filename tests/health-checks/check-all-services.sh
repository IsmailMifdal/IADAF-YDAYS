#!/bin/bash

# Quick Health Check for All Services
# Vérifie rapidement l'état de tous les services de la stack IA-DAF.

echo "======================================"
echo "❤️  Health Check - Tous les Services"
echo "======================================"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILURES=0

# Function to check service health
check_service() {
    local name=$1
    local url=$2

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓${NC} $name (HTTP $HTTP_CODE)"
    elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        echo -e "${YELLOW}⚠${NC} $name (HTTP $HTTP_CODE - Auth required)"
    else
        echo -e "${RED}✗${NC} $name (HTTP $HTTP_CODE or unreachable)"
        FAILURES=$((FAILURES + 1))
    fi
}

echo "Infrastructure:"
# PostgreSQL parle en TCP, pas en HTTP — on interroge le client dans le conteneur.
if docker exec iadaf-postgres pg_isready -U "${POSTGRES_USER:-iadaf_user}" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} PostgreSQL     (port 5432)"
else
    echo -e "${RED}✗${NC} PostgreSQL     (port 5432 - unreachable)"
    FAILURES=$((FAILURES + 1))
fi

echo ""
echo "Microservices:"
check_service "Discovery      " "http://localhost:8761/actuator/health"
check_service "API Gateway    " "http://localhost:8080/actuator/health"
check_service "AI Service     " "http://localhost:8086/ai/health"
check_service "User Service   " "http://localhost:8081/actuator/health"
check_service "Demarches      " "http://localhost:8082/actuator/health"
check_service "Document       " "http://localhost:8083/actuator/health"
check_service "Analytics      " "http://localhost:8085/actuator/health"

echo ""
echo "Frontend:"
check_service "Next.js        " "http://localhost:3000"

echo ""
echo "======================================"
if [ "$FAILURES" -eq 0 ]; then
    echo -e "${GREEN}Tous les services répondent.${NC}"
else
    echo -e "${RED}$FAILURES service(s) en échec.${NC}"
fi
echo "======================================"

exit "$FAILURES"
