#!/bin/bash

# Script de démarrage des microservices IA-DAF

echo "🔧 Chargement des variables d'environnement..."
if [ -f .env ]; then
    set -a
    source .env
    set +a
    echo "✅ Variables chargées depuis .env"
else
    echo "⚠️  ATTENTION : Fichier .env introuvable"
    echo "📝 Utilisation des valeurs par défaut"
fi

echo ""
echo "🐘 Vérification de PostgreSQL..."
docker ps | grep iadaf-postgres > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL est démarré"
else
    echo "❌ PostgreSQL n'est pas démarré"
    echo "📝 Exécutez : docker compose up -d"
    exit 1
fi

echo ""
echo "🔑 Vérification de Keycloak..."
docker ps | grep iadaf-keycloak > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Keycloak est démarré"
else
    echo "⚠️  Keycloak n'est pas démarré"
    echo "📝 Exécutez : docker compose up -d"
    echo "⏳ Attendre 2 minutes après le démarrage pour l'initialisation"
fi

echo ""
echo "🚀 Démarrage des services..."
echo "   POSTGRES_USER=${POSTGRES_USER:-iadaf_user}"
echo "   POSTGRES_DB=${POSTGRES_DB:-iadaf_db}"
echo ""

# Afficher le menu
echo "Services disponibles :"
echo "  1) discovery   - Discovery Service (Eureka) - Port 8761"
echo "  2) gateway     - API Gateway - Port 8080"
echo "  3) user        - User Service - Port 8081"
echo "  4) demarches   - Demarches Service - Port 8082"
echo "  5) document    - Document Service - Port 8083"
echo "  6) analytics   - Analytics Service - Port 8085"
echo "  7) ai          - AI Service - Port 8086"
echo "  8) all         - Tous les services (instructions)"
echo ""

read -p "Quel service voulez-vous démarrer ? (1-8) : " CHOICE

case $CHOICE in
    1|discovery)
        echo "🔍 Démarrage Discovery Service..."
        cd discovery-service && mvn spring-boot:run
        ;;
    2|gateway)
        echo "🌐 Démarrage API Gateway..."
        cd api-gateway && mvn spring-boot:run
        ;;
    3|user)
        echo "👤 Démarrage User Service..."
        cd user-service && mvn spring-boot:run
        ;;
    4|demarches)
        echo "📋 Démarrage Demarches Service..."
        cd demarches-service && mvn spring-boot:run
        ;;
    5|document)
        echo "📎 Démarrage Document Service..."
        cd document-service && mvn spring-boot:run
        ;;
    6|analytics)
        echo "📊 Démarrage Analytics Service..."
        cd analytics-service && mvn spring-boot:run
        ;;
    7|ai)
        echo "🤖 Démarrage AI Service..."
        cd ai-service && mvn spring-boot:run
        ;;
    8|all)
        echo ""
        echo "🔄 Pour démarrer tous les services, ouvrez 7 terminaux et exécutez :"
        echo ""
        echo "Terminal 1: cd discovery-service && mvn spring-boot:run"
        echo "Terminal 2: cd api-gateway && mvn spring-boot:run"
        echo "Terminal 3: cd user-service && mvn spring-boot:run"
        echo "Terminal 4: cd demarches-service && mvn spring-boot:run"
        echo "Terminal 5: cd document-service && mvn spring-boot:run"
        echo "Terminal 6: cd analytics-service && mvn spring-boot:run"
        echo "Terminal 7: cd ai-service && mvn spring-boot:run"
        echo ""
        echo "⚠️  IMPORTANT : Démarrer dans cet ordre et attendre que chaque service soit UP"
        ;;
    *)
        echo "❌ Choix invalide"
        exit 1
        ;;
esac
