import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// Le navigateur appelle /api/... sur le serveur Vite, qui relaie vers la passerelle de
// l'API en ajoutant la clé. La clé reste côté serveur : elle n'est jamais dans le bundle.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "AGRI_");
  if (!env.AGRI_API_KEY) {
    throw new Error("AGRI_API_KEY manquante : renseigner .env.local (voir README).");
  }
  const target = env.AGRI_API_URL || "http://127.0.0.1:8000";
  const proxy = {
    "/api": {
      target,
      changeOrigin: true,
      headers: { "X-API-Key": env.AGRI_API_KEY },
    },
  };
  return {
    plugins: [react()],
    server: { port: 5180, strictPort: true, proxy },
    preview: { port: 5180, strictPort: true, proxy },
  };
});
