#!/bin/bash

# Script de démarrage des microservices IA-DAF

echo "🔧 Chargement des variables d'environnement..."
if [ -f .env ]; then
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
echo "🚀 Démarrage des services..."
echo "   POSTGRES_USER=$POSTGRES_USER"
echo ""

read -p "Quel service voulez-vous démarrer ? (discovery/user/gateway/all) : " SERVICE

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
    all)
        echo "🔄 Démarrage de tous les services..."
        echo "⚠️  Ouvrez des terminaux séparés pour chaque service"
        ;;
    *)
        echo "❌ Service invalide"
        exit 1
        ;;
esac
