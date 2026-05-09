import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { apiMiddleware } from "./server/api"

const localApiPlugin = {
  name: "local-sqlite-api",
  configureServer(server: { middlewares: { use: (handler: typeof apiMiddleware) => void } }) {
    server.middlewares.use(apiMiddleware)
  },
  configurePreviewServer(server: { middlewares: { use: (handler: typeof apiMiddleware) => void } }) {
    server.middlewares.use(apiMiddleware)
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApiPlugin],
  resolve: {
    tsconfigPaths: true,
  },
})
