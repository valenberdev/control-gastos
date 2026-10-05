import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

function preconnectApi(apiUrl: string | undefined): Plugin {
  return {
    name: "preconnect-api",
    transformIndexHtml() {
      if (!apiUrl) return [];
      let origin: string;
      try {
        origin = new URL(apiUrl).origin;
      } catch {
        return [];
      }
      return [
        {
          tag: "link",
          attrs: { rel: "preconnect", href: origin },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    preconnectApi(loadEnv(mode, ".", "VITE_").VITE_API_URL),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
        type: "module",
      },
      manifest: {
        name: "Control de Gastos",
        short_name: "Gastos",
        description: "Control personal de ingresos y gastos por categoría",
        theme_color: "#05070F",
        background_color: "#05070F",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        globIgnores: ["og-image.png"],
      },
    }),
  ],
}));
