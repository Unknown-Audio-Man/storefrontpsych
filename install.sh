#!/bin/bash

echo "🚀 Step 1: Installing dependencies..."
npm install lucide-react
npm install -D tailwindcss postcss autoprefixer gh-pages

echo "🛠️ Step 2: Creating configuration files manually..."
# Force create tailwind.config.js to bypass the npx error
cat << 'EOF' > tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Noto Serif"', 'serif'],
        sans: ['"Noto Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
EOF

# Create postcss.config.js so Vite understands the Tailwind directives
cat << 'EOF' > postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# Ensure index.css has the Tailwind directives
cat << 'EOF' > src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

# Ensure Vite uses the correct GitHub Pages base path
cat << 'EOF' > vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/storefrontpsych/',
})
EOF

echo "📦 Step 3: Configuring package.json for deployment..."
npm pkg set homepage="https://Unknown-Audio-Man.github.io/storefrontpsych"
npm pkg set scripts.predeploy="npm run build"
npm pkg set scripts.deploy="gh-pages -d dist"

echo "💾 Step 4: Initializing Git & Committing to GitHub..."
git init
git remote add origin https://github.com/Unknown-Audio-Man/storefrontpsych.git
git add .
git commit -m "Automated configuration setup and deployment"
git branch -M main
git push -u origin main

echo "🌐 Step 5: Deploying to GitHub Pages..."
npm run deploy

echo "✅ Success! Your practice website is being published."
