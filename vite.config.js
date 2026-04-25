import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Add this line matching your GitHub repository name exactly:
  base: '/storefrontpsych/', 
})
