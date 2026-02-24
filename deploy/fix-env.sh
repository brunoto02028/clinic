#!/bin/bash
cd /root/clinic
sed -i "s|^DATABASE_URL=.*|DATABASE_URL='postgresql://clinic_admin:BrunoClinic2026!@localhost:5432/clinic_db'|" .env
echo "Updated DATABASE_URL:"
grep DATABASE_URL .env
