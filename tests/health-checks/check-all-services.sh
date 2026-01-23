#!/bin/bash

# Quick Health Check for All Services
# Vérifie rapidement l'état de tous les services

echo "======================================"
echo "❤️  Health Check - Tous les Services"
echo "======================================"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

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
    fi
}

echo "Docker Services:"
check_service "PostgreSQL     " "http://localhost:5432"
check_service "Keycloak       " "http://localhost:8180/health/ready"
check_service "pgAdmin        " "http://localhost:5050"

echo ""
echo "Microservices:"
check_service "Discovery      " "http://localhost:8761/actuator/health"
check_service "API Gateway    " "http://localhost:8080/actuator/health"
check_service "User Service   " "http://localhost:8081/actuator/health"
check_service "Demarches      " "http://localhost:8082/actuator/health"
check_service "Document       " "http://localhost:8083/actuator/health"
check_service "Analytics      " "http://localhost:8085/actuator/health"
check_service "AI Service     " "http://localhost:8086/actuator/health"

echo ""
echo "======================================"
