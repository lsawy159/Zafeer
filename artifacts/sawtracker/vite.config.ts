import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(import.meta.dirname), "");

  const rawPort = env.PORT ?? "5173";
  const port = Number(rawPort);
  if (Number.isNaN(port) || port <= 0) {
    console.warn(`[vite] Invalid PORT="${rawPort}", falling back to 5173`);
  }
  const resolvedPort = (Number.isNaN(port) || port <= 0) ? 5173 : port;

  const basePath = env.BASE_PATH ?? "/";

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),

    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
    },
    server: {
      port: resolvedPort,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port: resolvedPort,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
