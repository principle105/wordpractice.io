import { Server, Socket } from "socket.io";
import type { ViteDevServer } from "vite";
import type { User } from "@prisma/client";

import { lucia } from "../src/lib/server/auth";
import type { MatchUser, MatchType } from "../src/lib/types";
import { getGuestName, getGuestAvatar } from "../src/lib/utils/random";
import { convertStringToInteger } from "../src/lib/utils/conversions";
import { GUEST_SEED_SIZE } from "../src/lib/config";

import registerRankedHandler, {
    handleIfRankedMatchOver,
} from "./rankedHandler";
import registerCasualHandler, {
    handleIfCasualMatchOver,
} from "./casualHandler";

import { checkIfUserIsInRoom, rankedRooms, casualRooms } from "./state";

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
): Promise<MatchUser> => {
    let user: User | null = null;

    if (token) {
        try {
            user = (await lucia.validateSession(token)).user as User | null;
        } catch (e) {
            user = null;
        }
    }

    if (!user) {
        const name = getGuestName(guestAccountSeed);

        return {
            name,
            id: socket.id,
            rating: 0,
            avatar: getGuestAvatar(name),
            connected: true,
            replay: [],
        };
    }

    return {
        name: user.name,
        id: user.id,
        rating: user.rating,
        avatar: user.avatar,
        connected: true,
        replay: [],
    };
};

const getCurrentRateLimit = (userId: string): number => {
    let { lastAttempt, attempts } = connectionAttempts.get(userId) ?? {
        lastAttempt: 0,
        attempts: 0,
    };

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

    if (!server) return;

    const io = new Server(server);

    io.on("connection", async (socket) => {
        const { token, matchType, guestAccountSeed } = socket.handshake
            .query as {
            token: string | undefined;
            matchType: MatchType | undefined;
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

        const isUserInRoom = checkIfUserIsInRoom(user.id);

        if (isUserInRoom) {
            socket.emit("error", "You are already in a match.");
            socket.disconnect();
            return;
        }

        if (matchType === "ranked") {
            // Disconnecting a user if they are not authenticated
            if (!token) {
                socket.emit(
                    "error",
                    "You need to be logged in to play ranked mode."
                );
                socket.disconnect();
                return;
            }

            registerRankedHandler(socket, user);
        } else if (matchType === "casual") {
            registerCasualHandler(socket, user);
        } else {
            socket.disconnect();
            return;
        }

        // When the client disconnects
        socket.on("disconnect", async () => {
            const rooms =
                matchType === "ranked"
                    ? rankedRooms
                    : matchType === "casual"
                    ? casualRooms
                    : null;

            if (!rooms) return;

            for (const [roomId, room] of rooms) {
                if (user.id in room.users) {
                    room.users[user.id].connected = false;
                }

                socket.broadcast.to(roomId).emit("user-disconnect", user.id);

                // TODO: create a utility function for this
                if (matchType === "ranked") {
                    await handleIfRankedMatchOver(room, socket);
                } else if (matchType === "casual") {
                    await handleIfCasualMatchOver(room);
                }

                break;
            }
        });
    });
};

export default injectSocketIO;
