import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Supabase yerel ayarındaki site_url ile aynı adres.
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    // Excel kütüphanesi (exceljs) büyüktür; yalnızca şablon indirilirken veya
    // Excel dosyası yüklenirken ayrıca indirilir, panelin açılışını yavaşlatmaz.
    chunkSizeWarningLimit: 1200,
  },
})
