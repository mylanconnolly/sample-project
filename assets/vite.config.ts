import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import path from "node:path"

// `mix` runs Vite (dev watcher and `assets.deploy`) with MIX_ENV in the
// environment. Colocated LiveView hooks/CSS live under _build/<env>.
const mixEnv = process.env.MIX_ENV || "dev"

export default defineConfig({
  // Assets are served by Phoenix's Plug.Static from priv/static under /assets.
  base: "/assets/",
  plugins: [
    // Must come before the React plugin.
    tanstackRouter({
      target: "react",
      routesDirectory: "js/routes",
      generatedRouteTree: "js/routeTree.gen.ts",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "js"),
      "phoenix-colocated": path.resolve(
        __dirname,
        `../_build/${mixEnv}/phoenix-colocated`,
      ),
    },
  },
  build: {
    outDir: "../priv/static/assets",
    emptyOutDir: true,
    assetsDir: "",
    manifest: true,
    rollupOptions: {
      input: {
        index: "js/index.tsx",
        app: "js/app.js",
      },
      output: {
        // Split the rarely-changing framework core into its own chunk so app
        // code changes don't bust it for returning users across deploys.
        manualChunks: {
          vendor: ["react", "react-dom", "react-dom/client"],
          // Router + Query are app-shell (eager). react-form is intentionally
          // left out so it stays a lazy chunk loaded only on form routes.
          tanstack: ["@tanstack/react-query", "@tanstack/react-router"],
        },
      },
    },
  },
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    // Single-origin dev: the Phoenix page (:4000) imports modules from here.
    origin: "http://localhost:5173",
    cors: { origin: "http://localhost:4000" },
  },
})
