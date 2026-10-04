import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// https://vite.dev/config/
const mockApiEnabled = process.env.VITE_USE_MOCK_API === 'true';
const staffPortal = process.env.VITE_PORTAL_CONTEXT === 'staff';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@active-router': path.resolve(import.meta.dirname, staffPortal ? './src/app/router/staffRouter.tsx' : './src/app/router/router.tsx'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
  },
  server: {
    port: 5173,
  },
  build: {
    sourcemap: mockApiEnabled,
  },
});
