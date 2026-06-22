#!/usr/bin/env bash
# ============================================================
# backend/build.sh
# Script de déploiement automatique sur Render
# Render exécute ce fichier à chaque push sur GitHub
# ============================================================

# Arrête le script si une commande échoue
set -o errexit

# Installe toutes les dépendances Python
pip install -r requirements.txt

# Collecte les fichiers statiques (CSS/JS de l'admin Django)
python manage.py collectstatic --no-input

# Applique les migrations de base de données
python manage.py migrate