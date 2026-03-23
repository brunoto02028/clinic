#!/bin/bash
# ============================================================
# BPR.REHAB - Clinic Deployment Pipeline (Mac/Linux)
# ============================================================
# Automates: type-check -> git push -> user confirm -> VPS sync -> VPS deploy
# ============================================================

set -e

# Configuration
PROJ_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VPS="clinic-vps" # Matches ~/.ssh/config
VPS_PATH="/root/clinic"
LOG_FILE="$PROJ_DIR/scripts/deploy.log"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

function log_step() {
    echo -e "\n${CYAN}[$(date +%H:%M:%S)] STEP $1 - $2${NC}"
    echo "[$(date +%H:%M:%S)] STEP $1 - $2" >> "$LOG_FILE"
}

function log_ok() {
    echo -e "  ${GREEN}[OK] $1${NC}"
    echo "  OK: $1" >> "$LOG_FILE"
}

function log_warn() {
    echo -e "  ${YELLOW}[WARN] $1${NC}"
    echo "  WARN: $1" >> "$LOG_FILE"
}

function log_fail() {
    echo -e "  ${RED}[FAIL] $1${NC}"
    echo "  FAIL: $1" >> "$LOG_FILE"
}

# --- Start ---
echo -e "${CYAN}============================================"
echo -e "  BPR.REHAB - Clinic Deployment"
echo -e "  $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "============================================${NC}"
echo "=== Deployment started $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$LOG_FILE"

cd "$PROJ_DIR"

# PHASE 1: PRE-CHECKS & TYPE CHECK
log_step "1" "Type checking (TypeScript)"
if npx tsc --noEmit; then
    log_ok "No TypeScript errors found."
else
    log_fail "TypeScript errors detected. Fix them before deploying."
    exit 1
fi

# PHASE 2: GIT COMMIT & PUSH
log_step "2" "GitHub synchronization"
if [[ -n $(git status --porcelain) ]]; then
    git add -A
    COMMIT_MSG="chore: auto-sync $(date '+%Y-%m-%d %H:%M')"
    git commit -m "$COMMIT_MSG"
    log_ok "Changes committed: $COMMIT_MSG"
else
    log_ok "Working tree clean, nothing to commit."
fi

log_warn "Pushing to GitHub (main)..."
if git push origin main; then
    log_ok "Successfully pushed to GitHub."
else
    log_fail "Failed to push to GitHub. Check your connection/permissions."
    exit 1
fi

# PHASE 4: USER AUTHORIZATION
log_step "3" "User Authorization Required"
echo -e "${YELLOW}!!! ATTENTION !!!${NC}"
read -p "Do you want to deploy these changes to PRODUCTION (bpr.rehab)? (y/n): " confirm

if [[ "$confirm" != "y" ]]; then
    log_warn "Deployment cancelled by user."
    exit 0
fi

# PHASE 5: SYNC & DEPLOY
log_step "4" "Syncing files to VPS"
# Sync app, components, and lib directories (standard sync)
# For more efficiency, we can sync only changed files, but rsync is better for that.
# Since rsync might not be on all Mac/VPS setups, we'll use scp for now or rsync if available.

if command -v rsync &> /dev/null; then
    rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
        "$PROJ_DIR/app/" "$PROJ_DIR/components/" "$PROJ_DIR/lib/" \
        "$VPS:$VPS_PATH/"
    log_ok "Files synced via rsync."
else
    log_warn "rsync not found, using selective scp..."
    scp -r "$PROJ_DIR/app" "$PROJ_DIR/components" "$PROJ_DIR/lib" "$VPS:$VPS_PATH/"
    log_ok "Files synced via scp."
fi

log_step "5" "Executing remote deploy script"
if ssh "$VPS" "cd $VPS_PATH && bash deploy.sh"; then
    log_ok "Remote deployment complete and successful!"
else
    log_fail "Remote deployment failed. Check VPS logs."
    exit 1
fi

echo -e "\n${GREEN}=== Deployment Complete! ===${NC}"
echo "=== Deployment finished $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$LOG_FILE"
