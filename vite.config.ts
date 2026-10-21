import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  envPrefix: "VITE_",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // Enable CORS for Razorpay iframe compatibility
    cors: true,
  },
  plugins: [
    react(),
    // Installable app. The worker is src/sw.js, a pass-through that caches nothing:
    // injectManifest with no injection point means no precache manifest is generated.
    // skipWaiting and clientsClaim are done inside the worker itself.
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      injectRegister: "auto",
      injectManifest: { injectionPoint: undefined },
      devOptions: { enabled: false },
      // Send cookies with the manifest request, so it also loads on login-protected Vercel
      // previews (without them the manifest is redirected to Vercel's login page).
      useCredentials: true,
      manifest: {
        id: "/",
        name: "Sharma Coffee Works",
        short_name: "Sharma Coffee",
        description: "Premium artisanal coffee, freshly roasted in Coorg since 1987.",
        lang: "en",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0E1F12",
        background_color: "#F9F7F1",
        categories: ["food", "shopping"],
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
