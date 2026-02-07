import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  // Environment variables ที่ขึ้นต้นด้วย VITE_ จะถูก expose ให้ client โดยอัตโนมัติ
  // ใช้ import.meta.env.VITE_* เพื่อเข้าถึงค่า
})
