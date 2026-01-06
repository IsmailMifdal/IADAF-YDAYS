#!/bin/bash

# Script de démarrage des microservices IA-DAF

echo "🔧 Chargement des variables d'environnement..."
if [ -f .env ]; then
    # Use source instead of xargs for proper variable loading
    set -a
    source .env
    set +a
    echo "✅ Variables chargées depuis .env"
else
    echo "❌ ERREUR : Fichier .env introuvable"
    echo "📝 Exécutez : cp .env.example .env"
    exit 1
fi

echo ""
echo "🐘 Vérification de PostgreSQL..."
docker ps | grep iadaf-postgres > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL est démarré"
else
    echo "⚠️  PostgreSQL n'est pas démarré"
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
    exit 1
fi

echo ""
echo "🚀 Démarrage des services..."
echo "   POSTGRES_USER=$POSTGRES_USER"
echo "   POSTGRES_DB=$POSTGRES_DB"
echo ""

read -p "Quel service voulez-vous démarrer ? (discovery/user/gateway/demarches/document/analytics/ai/all) : " SERVICE

case $SERVICE in
    discovery)
        echo "🔍 Démarrage Discovery Service..."
        cd discovery-service && mvn spring-boot:run
        ;;
    user)
        echo "👤 Démarrage User Service..."
        cd user-service && mvn spring-boot:run
        ;;
    gateway)
        echo "🌐 Démarrage API Gateway..."
        cd api-gateway && mvn spring-boot:run
        ;;
    demarches)
        echo "📋 Démarrage Demarches Service..."
        cd demarches-service && mvn spring-boot:run
        ;;
    document)
        echo "📎 Démarrage Document Service..."
        cd document-service && mvn spring-boot:run
        ;;
    analytics)
        echo "📊 Démarrage Analytics Service..."
        cd analytics-service && mvn spring-boot:run
        ;;
    ai)
        echo "🤖 Démarrage AI Service..."
        cd ai-service && mvn spring-boot:run
        ;;
    all)
        echo "🔄 Démarrage de tous les services..."
        echo "⚠️  Ouvrez des terminaux séparés pour chaque service"
        echo ""
        echo "Terminal 1: cd discovery-service && mvn spring-boot:run"
        echo "Terminal 2: cd api-gateway && mvn spring-boot:run"
        echo "Terminal 3: cd user-service && mvn spring-boot:run"
        echo "Terminal 4: cd demarches-service && mvn spring-boot:run"
        echo "Terminal 5: cd document-service && mvn spring-boot:run"
        echo "Terminal 6: cd analytics-service && mvn spring-boot:run"
        echo "Terminal 7: cd ai-service && mvn spring-boot:run"
        ;;
    *)
        echo "❌ Service invalide"
        exit 1
        ;;
esac
