import { Server, Socket } from "socket.io";
import type { ViteDevServer } from "vite";
import type { Session } from "lucia";

import { auth } from "../src/lib/server/lucia";
import type { MatchUser, MatchType } from "../src/lib/types";
import registerRankedHandler from "./rankedHandler";
import registerCasualHandler from "./casualHandler";
import { checkIfUserIsInRoom } from "./state";

const getUserInfoFromSession = async (token: string, socket: Socket) => {
    let session: Session | null = null;

    if (token) {
        try {
            session = await auth.validateSession(token);
        } catch (e) {
            session = null;
        }
    }

    // TODO: prevent having to have this defined on both the client and server
    // TODO: add a default avatar
    if (!session) {
        return {
            username: "Guest",
            userId: socket.id,
            rating: 0,
            avatar: "",
        };
    }

    return {
        username: session.user.name,
        userId: session.user.id,
        rating: session.user.rating,
        avatar: session.user.avatar,
    };
};

const injectSocketIO = (server: ViteDevServer["httpServer"]) => {
    if (!server) return;

    const io = new Server(server);

    io.on("connection", async (socket) => {
        const token = socket.handshake.query.token as string;
        const matchType = socket.handshake.query.matchType as MatchType;

        const { username, userId, rating, avatar } =
            await getUserInfoFromSession(token, socket);

        let user: MatchUser = {
            id: userId,
            name: username,
            replay: [],
            rating,
            connected: true,
            avatar,
        };

        if (checkIfUserIsInRoom(userId)) {
            socket.disconnect();
            return;
        }

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
