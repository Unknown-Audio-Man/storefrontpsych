#!/bin/bash

# 0. Check for .env file BEFORE building
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    echo "Because you are building locally, Vite needs your Firebase keys to embed them into the app."
    echo "Please create a file named '.env' in this folder and add your keys like this:"
    echo ""
    echo "VITE_FIREBASE_API_KEY=AIzaSyYourRealKeyHere..."
    echo "VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com"
    echo "VITE_FIREBASE_PROJECT_ID=your-app-id"
    echo "VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com"
    echo "VITE_FIREBASE_MESSAGING_SENDER_ID=123456789"
    echo "VITE_FIREBASE_APP_ID=1:1234:web:abcd"
    echo "VITE_ADMIN_CODE=CLINICAL2026"
    echo ""
    echo "After creating the file, run this script again."
    exit 1
fi

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

# 1.5 Protect Secrets and Push to Main Branch
echo "Securing secrets and pushing source code to main branch..."
# Ensure .env is ignored so we don't leak Firebase keys
if [ -f .gitignore ]; then
    if ! grep -q "^\.env" .gitignore; then
        echo ".env" >> .gitignore
    fi
else
    echo ".env" > .gitignore
fi

# Commit and push root project to main
git add .
git commit -m "Update source code and deployment config"
git push origin main

# 2. Local Build and Manual Deployment Logic
echo "Building the project locally..."

# Ensure dependencies are installed
npm install

# Run the build process
# Note: This uses your local .env file variables
npm run build

if [ -d "dist" ]; then
    echo "Build successful. Preparing to deploy to gh-pages branch..."
    
    # Initialize a temporary git repo in the dist folder
    cd dist
    
    # FIX: Add .nojekyll file
    # GitHub Pages uses Jekyll by default, which ignores files/folders starting 
    # with underscores and can mess up Vite's asset routing.
    touch .nojekyll
    echo "Created .nojekyll file to prevent GitHub Pages routing issues."
    
    git init
    git add -A
    git commit -m "Manual deploy from local machine"
    
    # Force push to the gh-pages branch of your repository
    # This assumes your remote is named 'origin'
    echo "Pushing to GitHub..."
    git push -f git@github.com:Unknown-Audio-Man/storefrontpsych.git master:gh-pages
    
    cd ..
    echo "✅ Manual deployment complete! Your site should update at:"
    echo "https://unknown-audio-man.github.io/storefrontpsych/"
else
    echo "❌ Build failed. 'dist' folder not found. Please check for errors above."
    exit 1
fi

echo "✅ Local configuration and deployment script finished."
