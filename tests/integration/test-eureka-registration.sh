#!/bin/bash

# Test Eureka Service Registration
# Vérifie que tous les microservices sont enregistrés dans Eureka

echo "======================================"
echo "🔍 Test Enregistrement Eureka"
echo "======================================"
echo ""

FAILED=0
PASSED=0

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Wait for Eureka to be available
echo "Attente de Eureka sur http://localhost:8761..."
for i in {1..30}; do
    if curl -s http://localhost:8761/actuator/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Eureka est disponible${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Eureka n'est pas disponible après 30 secondes${NC}"
        exit 1
    fi
    sleep 1
done

echo ""

# Give services time to register
echo "Attente de l'enregistrement des services (30 secondes)..."
sleep 30

echo ""

# Test service registrations
SERVICES=("API-GATEWAY" "USER-SERVICE" "DEMARCHES-SERVICE" "DOCUMENT-SERVICE" "ANALYTICS-SERVICE" "AI-SERVICE")

echo "Test: Vérification de l'enregistrement des services..."
APPS=$(curl -s http://localhost:8761/eureka/apps)

for service in "${SERVICES[@]}"; do
    if echo "$APPS" | grep -q "<name>$service</name>"; then
        echo -e "${GREEN}✓ $service est enregistré${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ $service n'est PAS enregistré${NC}"
        ((FAILED++))
    fi
done

echo ""

# Check instance count
echo "Test: Vérification du nombre d'instances..."
for service in "${SERVICES[@]}"; do
    INSTANCES=$(echo "$APPS" | grep -o "<name>$service</name>" | wc -l)
    if [ "$INSTANCES" -ge 1 ]; then
        echo -e "${GREEN}✓ $service a $INSTANCES instance(s)${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ $service n'a AUCUNE instance${NC}"
        ((FAILED++))
    fi
done

echo ""
echo "======================================"
echo "📊 Résultats"
echo "======================================"
echo -e "${GREEN}Tests réussis: $PASSED${NC}"
echo -e "${RED}Tests échoués: $FAILED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Enregistrement Eureka: ÉCHEC${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Enregistrement Eureka: SUCCÈS${NC}"
    exit 0
fi
