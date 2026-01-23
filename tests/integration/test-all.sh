#!/bin/bash

# Master Test Script
# Exécute tous les tests d'intégration dans l'ordre

echo "========================================="
echo "🧪 IA-DAF - Suite de Tests d'Intégration"
echo "========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TOTAL_PASSED=0
TOTAL_FAILED=0

# Function to run a test
run_test() {
    local test_name=$1
    local test_script=$2
    
    echo ""
    echo "========================================="
    echo "Running: $test_name"
    echo "========================================="
    
    if bash "$SCRIPT_DIR/$test_script"; then
        echo -e "${GREEN}✅ $test_name: PASSED${NC}"
        ((TOTAL_PASSED++))
        return 0
    else
        echo -e "${RED}❌ $test_name: FAILED${NC}"
        ((TOTAL_FAILED++))
        return 1
    fi
}

# Run all tests
run_test "Test 1: Docker Infrastructure" "test-docker-infrastructure.sh"
INFRA_RESULT=$?

if [ $INFRA_RESULT -eq 0 ]; then
    run_test "Test 2: Eureka Registration" "test-eureka-registration.sh"
    run_test "Test 3: OAuth2 Flow" "test-oauth2-flow.sh"
    run_test "Test 4: Inter-Service Communication" "test-inter-service-communication.sh"
else
    echo -e "${RED}⚠️  Infrastructure tests failed. Skipping remaining tests.${NC}"
fi

# Summary
echo ""
echo "========================================="
echo "📊 RÉSUMÉ GLOBAL"
echo "========================================="
echo -e "${GREEN}Tests réussis: $TOTAL_PASSED${NC}"
echo -e "${RED}Tests échoués: $TOTAL_FAILED${NC}"
echo ""

if [ $TOTAL_FAILED -gt 0 ]; then
    echo -e "${RED}❌ SUITE DE TESTS: ÉCHEC${NC}"
    exit 1
else
    echo -e "${GREEN}✅ SUITE DE TESTS: SUCCÈS${NC}"
    echo ""
    echo "🎉 Tous les microservices sont opérationnels et communiquent correctement!"
    exit 0
fi
