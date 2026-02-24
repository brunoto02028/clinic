#!/bin/bash
set -e

systemctl start postgresql
systemctl enable postgresql

sudo -u postgres psql <<EOF
CREATE USER clinic_admin WITH PASSWORD 'BrunoClinic2026!';
CREATE DATABASE clinic_db OWNER clinic_admin;
GRANT ALL PRIVILEGES ON DATABASE clinic_db TO clinic_admin;
\c clinic_db
GRANT ALL ON SCHEMA public TO clinic_admin;
EOF

echo "DATABASE_OK"
