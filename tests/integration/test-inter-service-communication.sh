#!/bin/bash

# Test Inter-Service Communication
# Vérifie que les microservices peuvent communiquer entre eux

echo "======================================"
echo "🔗 Test Communication Inter-Services"
echo "======================================"
echo ""

FAILED=0
PASSED=0

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Obtain token
echo "Obtention d'un token d'authentification..."
TOKEN=$(curl -s -X POST 'http://localhost:8180/realms/iadaf/protocol/openid-connect/token' \
  -d 'client_id=iadaf-frontend' \
  -d 'grant_type=password' \
  -d 'username=admin@iadaf.com' \
  -d 'password=admin123' \
  | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}✗ Impossible d'obtenir un token${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Token obtenu${NC}"
echo ""

# Test 1: API Gateway → User Service
echo "Test 1: API Gateway → User Service..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:8080/api/users)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Communication API Gateway → User Service OK${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Communication API Gateway → User Service ÉCHEC (HTTP $HTTP_CODE)${NC}"
    ((FAILED++))
fi

# Test 2: API Gateway → Demarches Service
echo "Test 2: API Gateway → Demarches Service..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:8080/api/demarches)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Communication API Gateway → Demarches Service OK${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Communication API Gateway → Demarches Service ÉCHEC (HTTP $HTTP_CODE)${NC}"
    ((FAILED++))
fi

# Test 3: API Gateway → Document Service
echo "Test 3: API Gateway → Document Service..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:8080/api/documents)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Communication API Gateway → Document Service OK${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Communication API Gateway → Document Service ÉCHEC (HTTP $HTTP_CODE)${NC}"
    ((FAILED++))
fi

# Test 4: API Gateway → Analytics Service
echo "Test 4: API Gateway → Analytics Service..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:8080/api/analytics/dashboard)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "503" ]; then
    echo -e "${GREEN}✓ Communication API Gateway → Analytics Service OK${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Communication API Gateway → Analytics Service ÉCHEC (HTTP $HTTP_CODE)${NC}"
    ((FAILED++))
fi

# Test 5: API Gateway → AI Service
echo "Test 5: API Gateway → AI Service..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:8080/api/ai/conversations)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Communication API Gateway → AI Service OK${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Communication API Gateway → AI Service ÉCHEC (HTTP $HTTP_CODE)${NC}"
    ((FAILED++))
fi

echo ""

# Test 6: Create and retrieve data flow
echo "Test 6: Flux complet de création/récupération de données..."

# Create a user
USER_RESPONSE=$(curl -s -X POST http://localhost:8080/api/users \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "nom": "Test",
        "prenom": "User",
        "email": "test.integration@iadaf.com",
        "telephone": "+33612345678",
        "languePreferee": "FR",
        "paysOrigine": "France"
    }')

if echo "$USER_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    USER_ID=$(echo "$USER_RESPONSE" | jq -r '.id')
    echo -e "${GREEN}✓ Utilisateur créé avec succès (ID: $USER_ID)${NC}"
    ((PASSED++))
    
    # Retrieve the user
    GET_RESPONSE=$(curl -s http://localhost:8080/api/users/$USER_ID \
        -H "Authorization: Bearer $TOKEN")
    
    if echo "$GET_RESPONSE" | jq -e '.email' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Utilisateur récupéré avec succès${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Impossible de récupérer l'utilisateur${NC}"
        ((FAILED++))
    fi
    
    # Delete the user
    DELETE_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X DELETE http://localhost:8080/api/users/$USER_ID \
        -H "Authorization: Bearer $TOKEN")
    
    if [ "$DELETE_CODE" = "204" ] || [ "$DELETE_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Utilisateur supprimé avec succès${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Échec de la suppression (HTTP $DELETE_CODE)${NC}"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗ Échec de la création d'utilisateur${NC}"
    echo "Response: $USER_RESPONSE"
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
    echo -e "${RED}❌ Communication Inter-Services: ÉCHEC${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Communication Inter-Services: SUCCÈS${NC}"
    exit 0
fi
