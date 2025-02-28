import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    nodePolyfills({
      // Whether to polyfill `process` and `Buffer`
      // defaults to `true`
      process: true,
      // Whether to polyfill specific Node.js globals
      globals: {
        Buffer: true, // can be `true` or `false`
        global: true, // can be `true` or `false`
        // ...other globals
      } ,
    }as any),
  ],
  server: {
    host: '0.0.0.0',
    port:5173,
    allowedHosts:['3014-154-159-237-28.ngrok-free.app']
  }
})
