#!/bin/bash

# Script standalone pour tester l'installation et le lancement du daemon depuis develop
# Usage: bash scripts/test-daemon-develop.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 Test du Daemon depuis Develop (Standalone)${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# 1. Nettoyer les anciens daemons
echo -e "${BLUE}🧹 Étape 1: Nettoyage des anciens daemons...${NC}"
if [ -f "./kill-daemon.sh" ]; then
    bash ./kill-daemon.sh > /dev/null 2>&1 || true
    sleep 1
fi
echo -e "${GREEN}✅ Nettoyage terminé${NC}"
echo ""

# 2. Build du sidecar avec develop
echo -e "${BLUE}📦 Étape 2: Build du sidecar avec develop...${NC}"
export REACHY_MINI_SOURCE=develop

if [ -f "./build_sidecar_unix.sh" ]; then
    bash ./build_sidecar_unix.sh
else
    echo -e "${RED}❌ build_sidecar_unix.sh introuvable${NC}"
    exit 1
fi

if [ ! -d "src-tauri/binaries" ] || [ ! -f "src-tauri/binaries/uv" ]; then
    echo -e "${RED}❌ Échec du build du sidecar${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Sidecar build réussi avec develop${NC}"
echo ""

# 3. Vérifier la version installée
echo -e "${BLUE}🔍 Étape 3: Vérification de la version installée...${NC}"
cd src-tauri/binaries

if ./uv pip list | grep -q "reachy-mini"; then
    DAEMON_VERSION=$(./uv pip list | grep "^reachy-mini " | awk '{print $2}')
    DAEMON_LOCATION=$(./uv pip show reachy-mini | grep "Location:" | awk '{print $2}' || echo "unknown")
    echo -e "${GREEN}✅ reachy-mini installé: $DAEMON_VERSION${NC}"
    echo -e "${BLUE}   Location: $DAEMON_LOCATION${NC}"
    
    # Vérifier si c'est depuis GitHub (develop)
    if echo "$DAEMON_LOCATION" | grep -q "github"; then
        echo -e "${GREEN}   ✓ Installé depuis GitHub (develop)${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Installé depuis PyPI (pas develop)${NC}"
    fi
else
    echo -e "${RED}❌ reachy-mini non installé${NC}"
    exit 1
fi

cd "$PROJECT_DIR"
echo ""

# 4. Trouver le trampoline
echo -e "${BLUE}🚀 Étape 4: Préparation du lancement...${NC}"
BINARIES_DIR="src-tauri/binaries"
TRAMPOLINE=$(ls "$BINARIES_DIR"/uv-trampoline-* 2>/dev/null | head -n 1)

if [ -z "$TRAMPOLINE" ]; then
    echo -e "${RED}❌ uv-trampoline introuvable${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Trampoline trouvé: $(basename "$TRAMPOLINE")${NC}"
echo ""

# 5. Lancer le daemon
echo -e "${BLUE}🤖 Étape 5: Lancement du daemon...${NC}"

# Utiliser le chemin absolu du trampoline
TRAMPOLINE_ABS="$PROJECT_DIR/$TRAMPOLINE"

# Lancer le daemon en arrière-plan
echo -e "${YELLOW}   Lancement: $TRAMPOLINE_ABS run python -m reachy_mini.daemon.app.main --kinematics-engine Placo${NC}"

# Créer un fichier de log pour le daemon
DAEMON_LOG="$PROJECT_DIR/daemon-develop-test.log"
echo "=== Daemon log started at $(date) ===" > "$DAEMON_LOG"

# Changer vers le répertoire binaries pour que uv-trampoline trouve les ressources
cd "$BINARIES_DIR"

# Lancer le daemon et rediriger les logs
"$TRAMPOLINE_ABS" run python -m reachy_mini.daemon.app.main --kinematics-engine Placo >> "$DAEMON_LOG" 2>&1 &
DAEMON_PID=$!

# Revenir au répertoire du projet
cd "$PROJECT_DIR"

echo -e "${GREEN}✅ Daemon lancé (PID: $DAEMON_PID)${NC}"
echo -e "${BLUE}   Logs: $DAEMON_LOG${NC}"
echo ""

# 6. Attendre que le daemon soit prêt
echo -e "${BLUE}⏳ Étape 6: Attente du démarrage du daemon...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0
DAEMON_READY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    sleep 1
    ATTEMPT=$((ATTEMPT + 1))
    
    # Vérifier si le processus est toujours en vie
    if ! kill -0 "$DAEMON_PID" 2>/dev/null; then
        echo -e "${RED}❌ Le daemon s'est arrêté (vérifiez les logs: $DAEMON_LOG)${NC}"
        exit 1
    fi
    
    # Tester si le daemon répond
    if curl -s -f http://localhost:8000/api/daemon/status > /dev/null 2>&1; then
        DAEMON_READY=true
        break
    fi
    
    echo -n "."
done

echo ""

if [ "$DAEMON_READY" = true ]; then
    echo -e "${GREEN}✅ Daemon prêt après ${ATTEMPT}s${NC}"
else
    echo -e "${RED}❌ Le daemon n'a pas répondu après ${MAX_ATTEMPTS}s${NC}"
    echo -e "${YELLOW}   Vérifiez les logs: $DAEMON_LOG${NC}"
    echo -e "${YELLOW}   PID: $DAEMON_PID${NC}"
    kill "$DAEMON_PID" 2>/dev/null || true
    exit 1
fi

echo ""

# 7. Tester le daemon
echo -e "${BLUE}🧪 Étape 7: Tests du daemon...${NC}"

# Test 1: Status
echo -n "   Test status... "
if STATUS=$(curl -s http://localhost:8000/api/daemon/status 2>/dev/null); then
    echo -e "${GREEN}✅${NC}"
    echo "      Response: $STATUS"
else
    echo -e "${RED}❌${NC}"
fi

# Test 2: Version
echo -n "   Test version... "
if VERSION=$(curl -s http://localhost:8000/api/daemon/version 2>/dev/null); then
    echo -e "${GREEN}✅${NC}"
    echo "      Version: $VERSION"
else
    echo -e "${YELLOW}⚠️  Endpoint version non disponible${NC}"
fi

echo ""

# 8. Afficher les dernières lignes des logs
echo -e "${BLUE}📋 Dernières lignes des logs:${NC}"
tail -n 10 "$DAEMON_LOG" | sed 's/^/   /'

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}✅ Test réussi !${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo -e "${BLUE}📝 Informations:${NC}"
echo "   - Daemon PID: $DAEMON_PID"
echo "   - Logs: $DAEMON_LOG"
echo "   - API: http://localhost:8000"
echo ""
echo -e "${YELLOW}Pour arrêter le daemon:${NC}"
echo "   kill $DAEMON_PID"
echo "   ou"
echo "   bash ./kill-daemon.sh"
echo ""
echo -e "${YELLOW}Pour voir les logs en temps réel:${NC}"
echo "   tail -f $DAEMON_LOG"
echo ""

