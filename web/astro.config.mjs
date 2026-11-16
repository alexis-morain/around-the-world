import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://onefilmpercountry.morain.fr",
  trailingSlash: "always",
  build: { format: "directory" },
  vite: { plugins: [tailwindcss()] },
});
