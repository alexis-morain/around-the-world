import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://alexis-morain.github.io",
  base: "/one-film-per-country",
  trailingSlash: "always",
  build: { format: "directory" },
  vite: { plugins: [tailwindcss()] },
});
