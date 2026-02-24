#!/bin/bash
set -e

# Update DATABASE_URL in .env to use local PostgreSQL
cd /root/clinic
sed -i "s|^DATABASE_URL=.*|DATABASE_URL='postgresql://clinic_admin:BrunoClinic2026!@localhost:5432/clinic_db'|" .env

echo "Updated .env:"
grep DATABASE_URL .env
