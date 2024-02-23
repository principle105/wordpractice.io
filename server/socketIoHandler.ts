import { Server, Socket } from "socket.io";
import type { ViteDevServer } from "vite";
import type { Session } from "lucia";

import { auth } from "../src/lib/server/lucia";
import type { Room, MatchUser, MatchType } from "../src/lib/types";
import registerRankedHandler from "./rankedHandler";
import registerCasualHandler from "./casualHandler";
export interface RoomWithSocketInfo extends Room {
    sockets: Map<string, Socket>;
}

const getUserInfoFromSession = async (token: string, socket: Socket) => {
    let session: Session | null = null;

    if (token) {
        try {
            session = await auth.validateSession(token);
        } catch (e) {
            session = null;
        }
    }

    if (!session) {
        return {
            username: "Guest",
            userId: socket.id,
            rating: 0,
        };
    }

    return {
        username: session.user.name,
        userId: session.user.id,
        rating: session.user.rating,
    };
};

const injectSocketIO = (server: ViteDevServer["httpServer"]) => {
    if (!server) return;

    const io = new Server(server);

    io.on("connection", async (socket) => {
        const token = socket.handshake.query.token as string;
        const matchType = socket.handshake.query.matchType as MatchType;

        const { username, userId, rating } = await getUserInfoFromSession(
            token,
            socket
        );

        let user: MatchUser = {
            id: userId,
            name: username,
            replay: [],
            rating,
            connected: true,
        };

        if (matchType === "ranked") {
            // Disconnecting a user if they are not authenticated
            if (!token) {
                socket.disconnect();
                return;
            }

            registerRankedHandler(socket, user);
            return;
        }

        if (matchType === "casual") {
            registerCasualHandler(socket, user);
            return;
        }

        socket.disconnect();
    });
};

export default injectSocketIO;
