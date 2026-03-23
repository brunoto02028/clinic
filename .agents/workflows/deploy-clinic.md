---
description: How to deploy the Clinic project with user authorization
---

# Deploying the Clinic Project

Follow these steps to deploy changes to the production server (`bpr.rehab`) while ensuring code quality and user approval.

## 🚀 Deployment Process

1. **Verify Code Quality**:
   Before starting, ensure there are no critical TypeScript errors by running:
   ```bash
   npx tsc --noEmit
   ```

2. **Sync and Deploy**:
   Use the dedicated deployment script. This script will automatically:
   - Commit and push pending changes to GitHub (main branch).
   - **Ask for user permission** before sending changes to production.
   - Sync files and trigger the remote build on the VPS.

   // turbo
   Run the following command:
   ```bash
   bash scripts/deploy-clinic.sh
   ```

## ⚠️ Important Rules
- **NEVER** skip the authorization step.
- **ALWAYS** wait for the user to type `y` (or confirm via chat) before proceeding with the production sync.
- If the build fails on the VPS, check the remote logs at `/root/clinic/deploy.log`.
