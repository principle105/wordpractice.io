import type { Socket } from "socket.io";
import type { MatchUser, Room, RoomWithSocketInfo } from "../src/lib/types";

import { auth } from "../src/lib/server/lucia";
import type { Replay } from "../src/lib/types";
import { getCorrect, convertReplayToText } from "../src/lib/utils";
import { getWpmFromReplay } from "./utils";
import { rankedRooms } from "./state";

const MAX_ROOM_SIZE = 5;
const COUNTDOWN_TIME = 6 * 1000;
const MIN_JOIN_COUNTDOWN_TIME = 3 * 1000;

const K_FACTOR = 32;

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
        matchType: room.matchType,
    };
};

const registerRankedHandler = (socket: Socket, user: MatchUser) => {
    let joinedRoom = false;

    for (const [roomId, room] of rankedRooms) {
        // If the room is not full and the countdown has not started
        if (
            Object.keys(room.users).length < MAX_ROOM_SIZE &&
            (!room.startTime ||
                room.startTime > Date.now() + MIN_JOIN_COUNTDOWN_TIME)
        ) {
            let newRoomInfo = {
                ...room,
                users: { ...room.users, [user.id]: user },
                sockets: new Map([...room.sockets, [user.id, socket]]),
                startTime: room.startTime ?? Date.now() + COUNTDOWN_TIME,
            };

            rankedRooms.set(roomId, newRoomInfo);
            socket.join(roomId);
            joinedRoom = true;

            socket.emit(
                "existing-room-info",
                removeSocketInformationFromRoom(newRoomInfo, user.id)
            );

            socket.broadcast
                .to(roomId)
                .emit("update-start-time", newRoomInfo.startTime);
            socket.broadcast.to(roomId).emit("update-user", user);

            break;
        }
    }

    // Creating a new room if there are no available rooms
    if (!joinedRoom) {
        const roomId = Math.random().toString(36).substring(2, 8);

        const quote =
            "power power power power power power power power power power".split(
                " "
            );

        const room: RoomWithSocketInfo = {
            roomId,
            users: { [user.id]: user },
            quote,
            startTime: null,
            sockets: new Map([[user.id, socket]]),
            matchType: "ranked",
        };

        socket.emit(
            "existing-room-info",
            removeSocketInformationFromRoom(room, user.id)
        );

        rankedRooms.set(roomId, room);
        socket.join(roomId);
    }

    const handleIfRankedMatchOver = async (room: RoomWithSocketInfo) => {
        const totalUsersFinished = Object.values(room.users).reduce(
            (count, user) => {
                if (user.connected === false) return count + 1;

                const correctInput = getCorrect(
                    convertReplayToText(user.replay),
                    room.quote
                ).correct;

                if (correctInput.length === room.quote.join(" ").length) {
                    return count + 1;
                }

                return count;
            },
            0
        );

        if (totalUsersFinished < Object.keys(room.users).length - 1) {
            return;
        }

        // Rank the users based on their wpm
        const users = Object.values(room.users);
        users.sort((a, b) => {
            const aWpm = getWpmFromReplay(
                a.replay,
                room.startTime as number,
                room.quote
            );
            const bWpm = getWpmFromReplay(
                b.replay,
                room.startTime as number,
                room.quote
            );

            return bWpm - aWpm;
        });

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

        socket.broadcast.to(room.roomId).emit("ranked:update-rating", users);

        // Update the rating for each match user in the database
        users.forEach(async (user) => {
            try {
                await auth.updateUserAttributes(user.id, {
                    rating: user.rating,
                });
            } catch {}
        });

        rankedRooms.delete(room.roomId);

        // Disconnect all the users and delete the room
        for (const [_, socket] of room.sockets) {
            socket.disconnect();
        }
    };

    socket.on("update-user", async (replay: Replay) => {
        const roomId = Array.from(socket.rooms.values())[1];

        const room = rankedRooms.get(roomId);

        // Disconnecting a user if they are not in the room
        if (!room || !(user.id in room.users)) {
            socket.disconnect();
            return;
        }

        // Disconnecting a user if they start before the countdown
        if (room.startTime && room.startTime > replay[0].timestamp) {
            socket.disconnect();
            return;
        }

        user.replay = replay;
        room.users[user.id] = user;

        socket.broadcast.to(roomId).emit("update-user", user);

        await handleIfRankedMatchOver(room);
    });

    // When the client disconnects
    socket.on("disconnect", async () => {
        for (const [roomId, room] of rankedRooms) {
            if (user.id in room.users) {
                room.users[user.id].connected = false;
            }

            socket.broadcast.to(roomId).emit("user-disconnect", user.id);

            await handleIfRankedMatchOver(room);
            break;
        }
    });
};

export default registerRankedHandler;
