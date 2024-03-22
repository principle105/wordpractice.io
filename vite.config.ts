import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import injectSocketIO from "./server/socketIoHandler";
import type { ViteDevServer } from "vite";
import Icons from "unplugin-icons/vite";

export const webSocketServer = {
    name: "webSocketServer",
    configureServer(server: ViteDevServer) {
        injectSocketIO(server.httpServer);
    },
};

export default defineConfig({
    plugins: [
        sveltekit(),
        webSocketServer,
        Icons({
            compiler: "svelte",
            autoInstall: true, // experimental
        }),
    ],
});
