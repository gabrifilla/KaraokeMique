import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "WEB_ORIGIN");
  const webOrigin = new URL(env.WEB_ORIGIN || "http://localhost:5173");
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "canonical-development-origin",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (
              req.method === "GET" &&
              req.headers.accept?.includes("text/html") &&
              req.headers.host !== webOrigin.host
            ) {
              res.writeHead(302, {
                Location: `${webOrigin.origin}${req.url?.startsWith("/") ? req.url : "/"}`,
                "Cache-Control": "no-store",
              });
              res.end();
              return;
            }
            next();
          });
        },
      },
    ],
    envDir: process.cwd(),
    server: {
      allowedHosts: [webOrigin.hostname],
      headers: { "Referrer-Policy": "strict-origin-when-cross-origin" },
      port: Number(process.env.VITE_PORT || 5173),
      strictPort: true,
      proxy: {
        "/api": `http://127.0.0.1:${process.env.PORT || 3001}`,
        "/socket.io": {
          target: `http://127.0.0.1:${process.env.PORT || 3001}`,
          ws: true,
        },
      },
    },
    build: { outDir: "../../dist/web", emptyOutDir: true },
  };
});
