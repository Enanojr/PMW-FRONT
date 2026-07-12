#!/usr/bin/env bash
# Script de build que ejecuta Render en cada despliegue.
set -o errexit

pip install -r requirements.txt

# Estáticos del admin de Django (los sirve WhiteNoise).
python manage.py collectstatic --no-input

# Aplica migraciones a la base (Neon).
python manage.py migrate

# Crea el usuario administrador inicial si se definieron las variables
# ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD (idempotente).
python manage.py crear_admin_inicial
