import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: {
      // WHY: mirror the tsconfig "@/*" alias so tests import the same way as app code.
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
