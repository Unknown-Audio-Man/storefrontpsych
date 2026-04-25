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

# 2. Local Build and Manual Deployment Logic
# This replaces the deploy.yml workflow to stay within local control
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

# 3. Reminder for Environment Variables
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Your build might be missing Firebase credentials."
    echo "Please create a .env file with your VITE_FIREBASE_... keys before running this again."
fi

echo "✅ Local configuration and deployment script finished."
