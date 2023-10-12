import { Server } from "socket.io";
import type { ViteDevServer } from "vite";

export default function injectSocketIO(server: ViteDevServer["httpServer"]) {
    if (!server) return;

    const io = new Server(server);

    io.on("connection", (socket) => {
        console.log("Connected");
        socket.emit("name", "test");

        socket.on("updateValue", (message) => {
            console.log("updateValue", message);
        });

        socket.on("disconnect", function () {
            console.log("Got disconnect!");
        });
    });
}
