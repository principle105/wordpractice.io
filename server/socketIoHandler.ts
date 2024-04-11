import { Server, Socket } from "socket.io";
import type { ViteDevServer } from "vite";
import type { User } from "@prisma/client";

import { lucia } from "../src/lib/server/auth/clients";
import type { MatchUser } from "../src/lib/types";
import { getGuestUsername, getGuestAvatar } from "../src/lib/utils/random";
import { convertStringToInteger } from "../src/lib/utils/conversions";
import { GUEST_SEED_SIZE } from "../src/lib/config";

import registerRankedHandler, {
    handleIfRankedMatchOver,
} from "./rankedHandler";
import registerCasualHandler, {
    handleIfCasualMatchOver,
} from "./casualHandler";

import { rankedRooms, casualRooms, rankedQueue } from "./state";

const MAX_MATCH_LENGTH = 60 * 1000;

const MAX_CONNECTION_ATTEMPTS = 5;
const COOLDOWN_DURATION = 10000;
const connectionAttempts = new Map<
    string,
    { attempts: number; lastAttempt: number }
>();

const getMatchUserFromSession = async (
    token: string | undefined,
    guestAccountSeed: number,
    socket: Socket
): Promise<MatchUser | null> => {
    let user: User | null = null;

    if (token) {
        try {
            user = (await lucia.validateSession(token)).user as User | null;
        } catch (e) {
            return null;
        }
    }

    if (!user) {
        const username = getGuestUsername(guestAccountSeed);

        return {
            id: socket.id,
            username,
            rating: 0,
            avatar: getGuestAvatar(username),
            connected: true,
            replay: [],
        };
    }

    return {
        id: user.id,
        username: user.username,
        rating: user.rating,
        avatar: user.avatar,
        connected: true,
        replay: [],
    };
};

const getCurrentRateLimit = (userId: string): number => {
    const connectionData = connectionAttempts.get(userId);

    const lastAttempt = connectionData?.lastAttempt ?? 0;
    let attempts = connectionData?.attempts ?? 0;

    if (Date.now() - lastAttempt > COOLDOWN_DURATION) {
        connectionAttempts.delete(userId);
        attempts = 0;
    } else if (attempts >= MAX_CONNECTION_ATTEMPTS) {
        const timeUntilCooldown = Math.ceil(
            (COOLDOWN_DURATION - (Date.now() - lastAttempt)) / 1000
        );

        return timeUntilCooldown;
    }

    connectionAttempts.set(userId, {
        attempts: attempts + 1,
        lastAttempt: Date.now(),
    });

    return 0;
};

const injectSocketIO = (server: ViteDevServer["httpServer"]) => {
    // Periodically checking if any rooms have gone over the time limit
    setInterval(() => {
        const allRooms = [...rankedRooms.values(), ...casualRooms.values()];

        for (const room of allRooms) {
            if (
                room.startTime &&
                Date.now() > room.startTime + MAX_MATCH_LENGTH
            ) {
                room.sockets.forEach((socket) => {
                    socket.emit("match-ended");

                    if (room.matchType === "casual") {
                        handleIfCasualMatchOver(room, true);
                    } else if (room.matchType === "ranked") {
                        handleIfRankedMatchOver(room, socket, true);
                    }
                });
            }
        }
    }, 5000);

    if (!server) return;

    const io = new Server(server);

    io.on("connection", async (socket) => {
        const { token, matchType, guestAccountSeed } = socket.handshake
            .query as {
            token: string | undefined;
            matchType: string | undefined;
            guestAccountSeed: string | undefined;
        };

        const guestAccountSeedNumber = guestAccountSeed
            ? convertStringToInteger(guestAccountSeed as string)
            : null;

        if (
            guestAccountSeedNumber === null ||
            guestAccountSeedNumber.toString().length === GUEST_SEED_SIZE
        ) {
            socket.emit("error", "Invalid guest account seed.");
            socket.disconnect();
            return;
        }

        const rateLimit = getCurrentRateLimit(
            token ?? guestAccountSeedNumber.toString()
        );

        if (rateLimit > 0) {
            socket.emit(
                "error",
                `You are making too many connection attempts. Please wait ${rateLimit} seconds.`
            );
            socket.disconnect();
            return;
        }

        const user = await getMatchUserFromSession(
            token,
            guestAccountSeedNumber,
            socket
        );

        if (!user) {
            socket.emit("error", "Invalid session.");
            socket.disconnect();
            return;
        }

        // Disconnecting the user if they are not authenticated for ranked mode
        if (matchType === "ranked" && !token) {
            socket.emit(
                "error",
                "You need to be signed in to play ranked mode."
            );
            socket.disconnect();
            return;
        }

        // Disconnecting the user from all the rooms they are currently in
        for (const room of [...rankedRooms.values(), ...casualRooms.values()]) {
            if (room.sockets.has(user.id) && room.users[user.id].connected) {
                room.sockets.get(user.id)?.disconnect(true);
            }
        }

        // Removing the user from all the queues they are currently in
        for (const {
            user: queuedUser,
            socket: queuedUserSocket,
        } of rankedQueue.values()) {
            if (queuedUser.id === user.id) {
                queuedUserSocket.disconnect(true);
                rankedQueue.delete(queuedUser.id);
            }
        }

        if (matchType === "ranked") {
            registerRankedHandler(socket, user);
        } else if (matchType === "casual") {
            registerCasualHandler(socket, user);
        } else {
            socket.disconnect();
            return;
        }
    });
};

export default injectSocketIO;
