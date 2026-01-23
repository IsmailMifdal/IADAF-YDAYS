#!/bin/bash

# Test Docker Infrastructure
# Vérifie que PostgreSQL, Keycloak et pgAdmin sont opérationnels

echo "======================================"
echo "🐳 Test Infrastructure Docker"
echo "======================================"
echo ""

FAILED=0
PASSED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Docker containers running
echo "Test 1: Vérification des conteneurs Docker..."
if docker ps | grep -q "iadaf-postgres"; then
    echo -e "${GREEN}✓ PostgreSQL container is running${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ PostgreSQL container is NOT running${NC}"
    ((FAILED++))
fi

if docker ps | grep -q "iadaf-keycloak"; then
    echo -e "${GREEN}✓ Keycloak container is running${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Keycloak container is NOT running${NC}"
    ((FAILED++))
fi

if docker ps | grep -q "iadaf-pgadmin"; then
    echo -e "${GREEN}✓ pgAdmin container is running${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ pgAdmin container is NOT running${NC}"
    ((FAILED++))
fi

echo ""

# Test 2: PostgreSQL connectivity
echo "Test 2: Connexion PostgreSQL..."
if PGPASSWORD=iadaf_password psql -h localhost -U iadaf_user -d iadaf_db -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL est accessible${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ PostgreSQL n'est PAS accessible${NC}"
    ((FAILED++))
fi

echo ""

# Test 3: Verify schemas
echo "Test 3: Vérification des schémas PostgreSQL..."
SCHEMAS=$(PGPASSWORD=iadaf_password psql -h localhost -U iadaf_user -d iadaf_db -t -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('users', 'demarches', 'documents', 'analytics', 'ai');")

for schema in users demarches documents analytics ai; do
    if echo "$SCHEMAS" | grep -q "$schema"; then
        echo -e "${GREEN}✓ Schéma '$schema' existe${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Schéma '$schema' n'existe PAS${NC}"
        ((FAILED++))
    fi
done

echo ""

# Test 4: Keycloak health
echo "Test 4: Santé de Keycloak..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8180/health/ready)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Keycloak est opérationnel${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Keycloak n'est PAS opérationnel (HTTP $HTTP_CODE)${NC}"
    ((FAILED++))
fi

echo ""

# Test 5: Keycloak realm configuration
echo "Test 5: Configuration du realm Keycloak..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8180/realms/iadaf/.well-known/openid-configuration)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Realm 'iadaf' est configuré${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Realm 'iadaf' n'est PAS configuré (HTTP $HTTP_CODE)${NC}"
    ((FAILED++))
fi

echo ""
echo "======================================"
echo "📊 Résultats"
echo "======================================"
echo -e "${GREEN}Tests réussis: $PASSED${NC}"
echo -e "${RED}Tests échoués: $FAILED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Infrastructure Docker: ÉCHEC${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Infrastructure Docker: SUCCÈS${NC}"
    exit 0
fi
