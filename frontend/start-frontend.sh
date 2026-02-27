#!/bin/bash

# Script pour démarrer le frontend IA-DAF

echo "🚀 Démarrage du Frontend IA-DAF..."
echo ""

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez installer Node.js 20+."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Vérifier si les dépendances sont installées
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
    echo ""
fi

# Vérifier si le fichier .env.local existe
if [ ! -f ".env.local" ]; then
    echo "⚠️  Fichier .env.local non trouvé."
    echo "📋 Copie de .env.example vers .env.local..."
    cp .env.example .env.local
    echo "✅ Fichier .env.local créé. Veuillez vérifier la configuration."
    echo ""
fi

echo "🌐 Démarrage du serveur de développement..."
echo "📍 URL: http://localhost:3000"
echo ""
echo "Pour arrêter le serveur, appuyez sur Ctrl+C"
echo ""

npm run dev
