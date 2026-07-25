import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist-static",
    emptyOutDir: true,
    target: "es2022",
    sourcemap: false,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("/@react-three/drei/core/Gltf")
            || id.includes("/three-stdlib/loaders/GLTFLoader")
          ) {
            return "Gltf";
          }
        },
      },
    },
  },
});
