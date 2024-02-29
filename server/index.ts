import http from "http";
import express from "express";
import injectSocketIO from "./socketIoHandler";
import { handler } from "../build/handler.js";
import { rankedRooms, casualRooms } from "./state";
import { handleIfCasualMatchOver } from "./casualHandler";
import { handleIfRankedMatchOver } from "./rankedHandler";

const MAX_MATCH_LENGTH = 60 * 1000;

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

injectSocketIO(server);

app.use(handler);

// Periodically checking if any rooms have gone over the time limit
setInterval(() => {
    const allRooms = new Map([...rankedRooms, ...casualRooms]).values();

    for (const room of allRooms) {
        if (
            room &&
            room.startTime &&
            Date.now() > room.startTime + MAX_MATCH_LENGTH
        ) {
            room.sockets.forEach((socket) => {
                socket.emit("match-ended");
                if (room.matchType === "casual") {
                    handleIfCasualMatchOver(room);
                } else if (room.matchType === "ranked") {
                    handleIfRankedMatchOver(room, socket);
                }
            });
        }
    }
}, 5000);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
