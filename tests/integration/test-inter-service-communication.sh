#!/bin/bash

# Test Inter-Service Communication
# Vérifie la chaîne réelle : Frontend → API Gateway → AI Service,
# ainsi que l'authentification et le contrôle d'accès aux packs.

echo "======================================"
echo "🔗 Test Communication Inter-Services"
echo "======================================"
echo ""

FAILED=0
PASSED=0

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

FRONT="http://localhost:3000"
GATEWAY="http://localhost:8080"

pass() { echo -e "${GREEN}✓ $1${NC}"; ((PASSED++)); }
fail() { echo -e "${RED}✗ $1${NC}"; ((FAILED++)); }

expect_code() {
    local label=$1 expected=$2 actual=$3
    if [ "$actual" = "$expected" ]; then
        pass "$label (HTTP $actual)"
    else
        fail "$label (attendu $expected, reçu $actual)"
    fi
}

# --------------------------------------------------------------------------
# Test 1: API Gateway → AI Service
# --------------------------------------------------------------------------
echo "Test 1: API Gateway → AI Service..."

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY/api/ai/health")
expect_code "Route /api/ai/health via la gateway" "200" "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$GATEWAY/api/ai/chat" \
    -H "Content-Type: application/json" \
    -d '{"message":"Bonjour","language":"fr"}')
expect_code "Chatbot via la gateway" "200" "$CODE"

echo ""

# --------------------------------------------------------------------------
# Test 2: Frontend → API Gateway (proxy /api/ai/*)
# --------------------------------------------------------------------------
echo "Test 2: Frontend → API Gateway..."

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$FRONT/api/ai/chat" \
    -H "Content-Type: application/json" \
    -d '{"message":"Bonjour","language":"fr"}')
expect_code "Proxy du frontend vers l'AI Service" "200" "$CODE"

echo ""

# --------------------------------------------------------------------------
# Test 3: Cycle d'authentification complet
# --------------------------------------------------------------------------
echo "Test 3: Authentification..."

JAR=$(mktemp)
EMAIL="test-suite-$$@example.com"
PASSWORD="motdepasse1"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$FRONT/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Suite Test\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
expect_code "Création de compte" "201" "$CODE"

# Un doublon doit être refusé sans révéler que l'adresse existe.
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$FRONT/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Suite Test\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
expect_code "Refus du doublon d'adresse" "409" "$CODE"

CSRF=$(curl -s -c "$JAR" "$FRONT/api/auth/csrf" | sed -n 's/.*"csrfToken":"\([^"]*\)".*/\1/p')
curl -s -b "$JAR" -c "$JAR" -o /dev/null -X POST "$FRONT/api/auth/callback/credentials" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "csrfToken=$CSRF" \
    --data-urlencode "email=$EMAIL" \
    --data-urlencode "password=$PASSWORD"

if curl -s -b "$JAR" "$FRONT/api/auth/session" | grep -q "$EMAIL"; then
    pass "Connexion et session active"
else
    fail "Connexion — aucune session obtenue"
fi

echo ""

# --------------------------------------------------------------------------
# Test 4: Contrôle d'accès
# --------------------------------------------------------------------------
echo "Test 4: Contrôle d'accès..."

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONT/myFolders")
expect_code "Route privée refusée sans session" "307" "$CODE"

CODE=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" "$FRONT/myFolders")
expect_code "Route privée accessible avec session" "200" "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONT/nosPacks")
expect_code "Route publique accessible sans session" "200" "$CODE"

echo ""

# --------------------------------------------------------------------------
# Test 5: Paywall des packs
# --------------------------------------------------------------------------
echo "Test 5: Paywall des packs..."

if curl -s -b "$JAR" "$FRONT/api/entitlements" | grep -q '"unlocked":\[\]'; then
    pass "Aucun pack débloqué pour un compte neuf"
else
    fail "Un compte neuf ne devrait posséder aucun pack"
fi

CODE=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" "$FRONT/packs/impots")
expect_code "Pack non payé redirigé vers le paiement" "307" "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$FRONT/api/checkout" \
    -H "Content-Type: application/json" -d '{"slug":"impots"}')
expect_code "Checkout refusé sans authentification" "401" "$CODE"

CODE=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X POST "$FRONT/api/checkout" \
    -H "Content-Type: application/json" -d '{"slug":"pack-inexistant"}')
expect_code "Checkout refusé sur un pack inconnu" "404" "$CODE"

# Le webhook n'accorde jamais d'accès sans signature Stripe valide.
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$FRONT/api/stripe/webhook" \
    -H "Content-Type: application/json" -d '{"type":"checkout.session.completed"}')
if [ "$CODE" = "400" ] || [ "$CODE" = "503" ]; then
    pass "Webhook Stripe rejeté sans signature valide (HTTP $CODE)"
else
    fail "Webhook Stripe — attendu 400 ou 503, reçu $CODE"
fi

rm -f "$JAR"

echo ""
echo "======================================"
echo "📊 Résultats"
echo "======================================"
echo -e "${GREEN}Tests réussis: $PASSED${NC}"
echo -e "${RED}Tests échoués: $FAILED${NC}"
echo ""
echo "ℹ️  Le compte $EMAIL a été créé par cette suite."
echo "   Suppression : docker exec iadaf-postgres psql -U iadaf_user -d iadaf_db \\"
echo "                   -c \"DELETE FROM users.app_users WHERE email LIKE 'test-suite-%';\""
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Communication Inter-Services: ÉCHEC${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Communication Inter-Services: SUCCÈS${NC}"
    exit 0
fi
