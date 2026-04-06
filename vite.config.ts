import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const prozoTarget =
    (env.VITE_PROZO_BASE_URL && env.VITE_PROZO_BASE_URL.replace(/\/+$/, "")) ||
    "https://proship.prozo.com";

  return {
    envPrefix: "VITE_",
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      // Enable CORS for Razorpay iframe compatibility
      cors: true,
      proxy: {
        "/prozo-api": {
          target: prozoTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/prozo-api/, "") || "/",
        },
      },
    },
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
