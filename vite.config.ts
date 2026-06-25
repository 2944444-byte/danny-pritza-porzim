import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config. The dev server runs on port 5173 by default; the API base URL is
// configured via VITE_API_BASE_URL (see .env.example), not here.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
});
