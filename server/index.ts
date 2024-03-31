import http from "http";
import express from "express";
import injectSocketIO from "./socketIoHandler";
import { handler } from "../build/handler.js";

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5173;

injectSocketIO(server);

app.use(handler);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
