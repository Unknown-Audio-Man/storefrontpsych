#!/bin/bash

# 1. Update vite.config.js
echo "Updating vite.config.js with base path..."
cat <<EOF > vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/storefrontpsych/',
})
EOF

# 2. Create/Update GitHub Actions Workflow
echo "Setting up .github/workflows/deploy.yml..."
mkdir -p .github/workflows
cat <<EOF > .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install and Build
        run: |
          npm install
          npm run build
        env:
          VITE_FIREBASE_API_KEY: \${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: \${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: \${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: \${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: \${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: \${{ secrets.VITE_FIREBASE_APP_ID }}
          VITE_ADMIN_CODE: \${{ secrets.VITE_ADMIN_CODE }}

      - name: Deploy
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: dist
          branch: gh-pages
EOF

# 3. Check for .env and upload secrets if gh is authenticated
if [ -f .env ]; then
    if gh auth status >/dev/null 2>&1; then
        echo "Detected .env and authenticated gh CLI. Uploading secrets..."
        gh secret set -f .env
    else
        echo "⚠️  .env found but gh CLI is not authenticated. Please run 'gh auth login' then 'gh secret set -f .env'"
    fi
else
    echo "⚠️  .env file not found. Create one with your VITE_ keys first!"
fi

echo "✅ Configuration fixed. Now commit and push your changes."
