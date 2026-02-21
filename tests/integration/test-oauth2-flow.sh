#!/bin/bash

# Test OAuth2 Authentication Flow
# Vérifie que l'authentification fonctionne correctement

echo "======================================"
echo "🔐 Test Flux OAuth2"
echo "======================================"
echo ""

FAILED=0
PASSED=0

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Test 1: Obtain token for admin user
echo "Test 1: Obtention d'un token pour l'utilisateur admin..."
TOKEN_RESPONSE=$(curl -s -X POST 'http://localhost:8180/realms/iadaf/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=iadaf-frontend' \
  -d 'grant_type=password' \
  -d 'username=admin@iadaf.com' \
  -d 'password=admin123')

if echo "$TOKEN_RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✓ Token obtenu avec succès${NC}"
    TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')
    ((PASSED++))
else
    echo -e "${RED}✗ Échec de l'obtention du token${NC}"
    echo "Response: $TOKEN_RESPONSE"
    ((FAILED++))
    exit 1
fi

echo ""

# Test 2: Verify token structure
echo "Test 2: Vérification de la structure du token..."
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "${GREEN}✓ Token valide (non-null)${NC}"
    ((PASSED++))
    
    # Decode JWT header and payload (JWT uses base64url encoding)
    # Add padding if needed for base64 decoding
    PAYLOAD_RAW=$(echo "$TOKEN" | cut -d. -f2)
    PAYLOAD=$(echo "$PAYLOAD_RAW" | base64 -d 2>/dev/null || echo "$PAYLOAD_RAW" | sed 's/-/+/g; s/_/\//g' | base64 -d 2>/dev/null)
    
    if echo "$PAYLOAD" | jq . > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Token JWT bien formé${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Token JWT mal formé${NC}"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗ Token invalide${NC}"
    ((FAILED++))
fi

echo ""

# Test 3: Check token claims
echo "Test 3: Vérification des claims du token..."
PAYLOAD_DECODED=$(echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null)

CLAIMS=("sub" "email" "preferred_username" "realm_access")
for claim in "${CLAIMS[@]}"; do
    if echo "$PAYLOAD_DECODED" | jq -e ".$claim" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Claim '$claim' présent${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Claim '$claim' absent${NC}"
        ((FAILED++))
    fi
done

echo ""

# Test 4: Test token with API Gateway
echo "Test 4: Test du token avec l'API Gateway..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:8080/actuator/health)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Token accepté par l'API Gateway${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Token rejeté par l'API Gateway (HTTP $HTTP_CODE)${NC}"
    ((FAILED++))
fi

echo ""

# Test 5: Test invalid token
echo "Test 5: Test d'un token invalide..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer invalid_token_123" \
    http://localhost:8080/api/users)

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Token invalide correctement rejeté (401)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Token invalide non rejeté (HTTP $HTTP_CODE)${NC}"
    ((FAILED++))
fi

echo ""

# Test 6: Test all test users
echo "Test 6: Test de tous les utilisateurs de test..."
USERS=("admin@iadaf.com:admin123" "user@iadaf.com:user123" "agent@iadaf.com:agent123" "support@iadaf.com:support123")

for user_creds in "${USERS[@]}"; do
    IFS=':' read -r username password <<< "$user_creds"
    
    RESPONSE=$(curl -s -X POST 'http://localhost:8180/realms/iadaf/protocol/openid-connect/token' \
      -d "client_id=iadaf-frontend" \
      -d "grant_type=password" \
      -d "username=$username" \
      -d "password=$password")
    
    if echo "$RESPONSE" | grep -q "access_token"; then
        echo -e "${GREEN}✓ Utilisateur '$username' peut s'authentifier${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Utilisateur '$username' ne peut PAS s'authentifier${NC}"
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
    echo -e "${RED}❌ Flux OAuth2: ÉCHEC${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Flux OAuth2: SUCCÈS${NC}"
    exit 0
fi
