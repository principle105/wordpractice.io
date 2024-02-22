import { Server, Socket } from "socket.io";
import type { ViteDevServer } from "vite";
import type { Session } from "lucia";

import { auth } from "../src/lib/server/lucia";
import type { Room, MatchUser, Replay } from "../src/lib/types";
import {
    getCorrect,
    convertReplayToText,
    calculateWpm,
} from "../src/lib/utils";
import { START_TIME_LENIENCY } from "../src/lib/config";

const MAX_ROOM_SIZE = 5;
const COUNTDOWN_TIME = 6 * 1000;
const MIN_JOIN_COUNTDOWN_TIME = 3 * 1000;

export interface RoomWithSocketInfo extends Room {
    sockets: Map<string, Socket>;
}

const removeSocketInformationFromRoom = (
    room: RoomWithSocketInfo,
    userId: string
): Room => {
    const usersWithoutSocket = {
        ...room.users,
    };

    if (userId in usersWithoutSocket) {
        delete usersWithoutSocket[userId];
    }

    return {
        roomId: room.roomId,
        quote: room.quote,
        startTime: room.startTime,
        users: usersWithoutSocket,
    };
};

// const generateWordList = (length: number) => {
//     const words: string[] = [];
//     for (let i = 0; i < length; i++) {
//         words.push(WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)]);
//     }
//     return words;
// };

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

const getWpmFromReplay = (
    replay: Replay,
    roomStartTime: number,
    quote: string[]
) => {
    const startTime = Math.min(
        replay[0]?.timestamp,
        roomStartTime + START_TIME_LENIENCY
    );

    // Checking if the user didn't finish
    if (convertReplayToText(replay).join(" ") !== quote.join(" ")) {
        return 0;
    }

    const wpm = calculateWpm(
        replay[replay.length - 1]?.timestamp,
        startTime,
        quote.join(" ").length
    );

    return wpm;
};

const injectSocketIO = (server: ViteDevServer["httpServer"]) => {
    if (!server) return;

    const io = new Server(server);
    const rooms = new Map<string, RoomWithSocketInfo>();

    io.on("connection", async (socket) => {
        const token = socket.handshake.query.token as string;

        const { username, userId, rating } = await getUserInfoFromSession(
            token,
            socket
        );

        let joinedRoom = false;

        let user: MatchUser = {
            id: userId,
            name: username,
            replay: [],
            rating,
            connected: true,
        };

        for (const [roomId, room] of rooms) {
            if (
                Object.keys(room.users).length < MAX_ROOM_SIZE &&
                room.startTime > Date.now() + MIN_JOIN_COUNTDOWN_TIME
            ) {
                room.users[userId] = user;
                socket.join(roomId);
                joinedRoom = true;

                socket.broadcast
                    .to(roomId)
                    .emit("server-update-match-user", user);

                socket.emit(
                    "existing-room-info",
                    removeSocketInformationFromRoom(room, userId)
                );

                break;
            }
        }

        if (!joinedRoom) {
            const roomId = Math.random().toString(36).substring(2, 8);
            const quote =
                "power power power power power power power power power power".split(
                    " "
                );

            const room: RoomWithSocketInfo = {
                roomId,
                users: { [userId]: user },
                quote,
                startTime: Date.now() + COUNTDOWN_TIME,
                sockets: new Map([[userId, socket]]),
            };

            socket.emit(
                "existing-room-info",
                removeSocketInformationFromRoom(room, userId)
            );

            rooms.set(roomId, room);
            socket.join(roomId);
        }

        const handleIfRankedMatchOver = async (room: RoomWithSocketInfo) => {
            const allUsersFinished = Object.values(room.users).every((user) => {
                if (user.connected === false) return true;

                const correctInput = getCorrect(
                    convertReplayToText(user.replay),
                    room.quote
                ).correct;

                return correctInput.length === room.quote.join(" ").length;
            });

            if (!allUsersFinished) {
                return;
            }

            // Rank the users based on their wpm
            const users = Object.values(room.users);
            users.sort((a, b) => {
                const aWpm = getWpmFromReplay(
                    a.replay,
                    room.startTime,
                    room.quote
                );
                const bWpm = getWpmFromReplay(
                    b.replay,
                    room.startTime,
                    room.quote
                );

                return bWpm - aWpm;
            });

            const K_FACTOR = 32;

            users.forEach((winner, ranking) => {
                if (ranking === users.length - 1) return;

                const loser = users[ranking + 1];

                const winnerChance =
                    1.0 /
                    (1.0 + Math.pow(10, (loser.rating - winner.rating) / 400));

                const loserChance =
                    1.0 /
                    (1.0 + Math.pow(10, (winner.rating - loser.rating) / 400));

                const winnerNewRating = Math.round(
                    winner.rating + K_FACTOR * (1 - winnerChance)
                );
                const loserNewRating = Math.round(
                    loser.rating + K_FACTOR * (0 - loserChance)
                );

                users[ranking].rating = winnerNewRating;
                users[ranking + 1].rating = loserNewRating;
            });

            socket.broadcast.to(room.roomId).emit("update-rating", users);

            // Update the rating for each match user in the database
            users.forEach(async (user) => {
                await auth.updateUserAttributes(user.id, {
                    rating: user.rating,
                });
            });

            rooms.delete(room.roomId);

            // Disconnect all the users and delete the room
            for (const [_, socket] of room.sockets) {
                socket.disconnect();
            }
        };

        socket.on("client-update-match-user", async (replay: Replay) => {
            const roomId = Array.from(socket.rooms.values())[1];

            const room = rooms.get(roomId);

            // Disconnecting a user if they are not in the room
            if (!room || !(userId in room.users)) {
                socket.disconnect();
                return;
            }

            // Disconnecting a user if they start before the countdown
            if (room.startTime > replay[0].timestamp) {
                socket.disconnect();
                return;
            }

            user.replay = replay;
            room.users[userId] = user;

            socket.broadcast.to(roomId).emit("server-update-match-user", user);

            await handleIfRankedMatchOver(room);
        });

        // When the client disconnects
        socket.on("disconnect", async () => {
            for (const [roomId, room] of rooms) {
                if (!(userId in room.users)) return;

                room.users[userId].connected = false;

                socket.broadcast.to(roomId).emit("user-disconnect", user.id);

                await handleIfRankedMatchOver(room);
                break;
            }
        });
    });
};

export default injectSocketIO;
