import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "force-full-reload",
      handleHotUpdate({ server }) {
        server.ws.send({ type: "full-reload" });
        return [];
      },
    },
  ],
});
