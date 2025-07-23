import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '../', // This tells Vite to look for .env files in the parent directory (chatbot folder)
  server: {
    port: 5174, // Set to match the GOOGLE_REDIRECT_URI in .env
    host: true
  }
})