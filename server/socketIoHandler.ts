import { Server, Socket } from "socket.io";
import type { ViteDevServer } from "vite";
import type { Session } from "lucia";

import { auth } from "../src/lib/server/lucia";
import type { MatchUser, MatchType } from "../src/lib/types";
import {
    getGuestName,
    convertStringToInteger,
    getGuestAvatar,
} from "../src/lib/utils";

import registerRankedHandler, {
    handleIfRankedMatchOver,
} from "./rankedHandler";
import registerCasualHandler, {
    handleIfCasualMatchOver,
} from "./casualHandler";
import { checkIfUserIsInRoom, rankedRooms, casualRooms } from "./state";

const MAX_MATCH_LENGTH = 20 * 1000;

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
    let session: Session | null = null;

    if (token) {
        try {
            session = await auth.validateSession(token);
        } catch (e) {
            session = null;
        }
    }

    if (!session) {
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
        name: session.user.name,
        id: session.user.id,
        rating: session.user.rating,
        avatar: session.user.avatar,
        connected: true,
        replay: [],
    };
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
        const ipAddress = socket.handshake.address;

        const { lastAttempt, attempts } = connectionAttempts.get(ipAddress) ?? {
            lastAttempt: 0,
            attempts: 0,
        };

        if (Date.now() - lastAttempt > COOLDOWN_DURATION) {
            connectionAttempts.delete(ipAddress);
        }

        if (attempts >= MAX_CONNECTION_ATTEMPTS) {
            const timeUntilCooldown = Math.ceil(
                (COOLDOWN_DURATION - (Date.now() - lastAttempt)) / 1000
            );

            socket.emit(
                "error",
                `Too many connection attempts. Please try again in ${timeUntilCooldown} seconds.`
            );
            socket.disconnect();
            return;
        }

        connectionAttempts.set(ipAddress, {
            attempts: attempts + 1,
            lastAttempt: Date.now(),
        });

        const token = socket.handshake.query.token as string | undefined;
        const matchType = socket.handshake.query.matchType as
            | MatchType
            | undefined;
        const guestAccountSeed = socket.handshake.query.guestAccountSeed as
            | string
            | undefined;

        const guestAccountSeedNumber = guestAccountSeed
            ? convertStringToInteger(guestAccountSeed as string)
            : null;

        if (guestAccountSeedNumber === null) {
            socket.emit("error", "Invalid guest account seed.");
            socket.disconnect();
            return;
        }

        let user = await getMatchUserFromSession(
            token,
            guestAccountSeedNumber,
            socket
        );

        if (checkIfUserIsInRoom(user.id)) {
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
            let rooms =
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
