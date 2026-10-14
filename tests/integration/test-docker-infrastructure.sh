#!/bin/bash

# Test Docker Infrastructure
# Vérifie que PostgreSQL et les conteneurs applicatifs sont opérationnels.

echo "======================================"
echo "🐳 Test Infrastructure Docker"
echo "======================================"
echo ""

FAILED=0
PASSED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

PG_USER="${POSTGRES_USER:-iadaf_user}"
PG_DB="${POSTGRES_DB:-iadaf_db}"

# psql n'est pas toujours installé sur la machine hôte : on passe par le conteneur.
psql_query() {
    docker exec -e PGPASSWORD="${POSTGRES_PASSWORD:-iadaf_password}" iadaf-postgres \
        psql -U "$PG_USER" -d "$PG_DB" -t -c "$1" 2>/dev/null
}

check_container() {
    local name=$1
    local label=$2
    if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
        echo -e "${GREEN}✓ $label container is running${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ $label container is NOT running${NC}"
        ((FAILED++))
    fi
}

# Test 1: Docker containers running
echo "Test 1: Vérification des conteneurs Docker..."
check_container "iadaf-postgres"  "PostgreSQL"
check_container "iadaf-discovery" "Discovery"
check_container "iadaf-gateway"   "API Gateway"
check_container "iadaf-ai"        "AI Service"
check_container "iadaf-user"      "User Service"
check_container "iadaf-demarches" "Demarches Service"
check_container "iadaf-document"  "Document Service"
check_container "iadaf-analytics" "Analytics Service"
check_container "iadaf-front"     "Frontend"

echo ""

# Test 2: PostgreSQL connectivity
echo "Test 2: Connexion PostgreSQL..."
if psql_query "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL est accessible${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ PostgreSQL n'est PAS accessible${NC}"
    ((FAILED++))
fi

echo ""

# Test 3: Verify schemas
echo "Test 3: Vérification des schémas PostgreSQL..."
SCHEMAS=$(psql_query "SELECT schema_name FROM information_schema.schemata;")

for schema in users demarches documents analytics ai; do
    if echo "$SCHEMAS" | grep -q "\b$schema\b"; then
        echo -e "${GREEN}✓ Schéma '$schema' existe${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Schéma '$schema' n'existe PAS${NC}"
        ((FAILED++))
    fi
done

echo ""

# Test 4: Tables d'authentification et de facturation
# Elles sont créées à la volée au premier accès du frontend.
echo "Test 4: Tables applicatives..."
for table in app_users pack_entitlements; do
    EXISTS=$(psql_query "SELECT to_regclass('users.$table');")
    if echo "$EXISTS" | grep -q "$table"; then
        echo -e "${GREEN}✓ Table 'users.$table' existe${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Table 'users.$table' n'existe PAS (ouvrez le frontend une fois)${NC}"
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
    echo -e "${RED}❌ Infrastructure Docker: ÉCHEC${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Infrastructure Docker: SUCCÈS${NC}"
    exit 0
fi
