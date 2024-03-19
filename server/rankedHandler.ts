import type { Socket } from "socket.io";
import type { Replay, MatchUser, RoomWithSocketInfo } from "../src/lib/types";

import { client } from "../src/lib/server/auth";
import {
    getCorrect,
    convertReplayToText,
    calculateWpm,
} from "../src/lib/utils";
import { rankedRooms } from "./state";
import { START_TIME_LENIENCY } from "../src/lib/config";
import { removeSocketInformationFromRoom } from "./utils";

const MAX_ROOM_SIZE = 3;
const COUNTDOWN_TIME = 6 * 1000;
const MIN_JOIN_COUNTDOWN_TIME = 3 * 1000;

const K_FACTOR = 32;

export const handleIfRankedMatchOver = async (
    room: RoomWithSocketInfo,
    socket: Socket,
    force: boolean = false
) => {
    if (!room) {
        return;
    }

    if (!force) {
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

        // Checking if all the users - 1 have finished
        if (totalUsersFinished < Object.keys(room.users).length - 1) {
            return;
        }
    }

    rankedRooms.delete(room.roomId);

    // Rank the users based on their wpm
    const users = Object.values(room.users);

    // Calculating wpm based on the current time to account for users who haven't finished
    const endTime = Date.now();

    const getWpmFromReplay = (replay: Replay) => {
        const startTime = Math.min(
            replay[0]?.timestamp,
            (room.startTime as number) + START_TIME_LENIENCY
        );

        const { correct } = getCorrect(convertReplayToText(replay), room.quote);

        return calculateWpm(endTime, startTime, correct.length);
    };

    users.sort((a, b) => {
        const aWpm = getWpmFromReplay(a.replay);
        const bWpm = getWpmFromReplay(b.replay);

        return bWpm - aWpm;
    });

    users.forEach((user1, ranking1) => {
        for (let ranking2 = ranking1 + 1; ranking2 < users.length; ranking2++) {
            const user2 = users[ranking2];

            const user1Chance =
                1.0 / (1.0 + Math.pow(10, (user2.rating - user1.rating) / 400));

            const user2Chance =
                1.0 / (1.0 + Math.pow(10, (user1.rating - user2.rating) / 400));

            const user1NewRating = Math.round(
                user1.rating + K_FACTOR * (1 - user1Chance)
            );
            const user2NewRating = Math.round(
                user2.rating + K_FACTOR * (0 - user2Chance)
            );

            users[ranking1].rating = user1NewRating;
            users[ranking2].rating = user2NewRating;
        }
    });

    // Update the rating for each match user in the database
    users.forEach(async (user) => {
        try {
            await client.user.update({
                where: { id: user.id },
                data: {
                    rating: user.rating,
                },
            });
        } catch {}
    });

    const userRatings = users.map((user) => ({
        id: user.id,
        rating: user.rating,
    }));

    socket.broadcast.to(room.roomId).emit("update-rating", userRatings);
    socket.emit("update-rating", userRatings);

    // Disconnect all the users and delete the room
    for (const socket of room.sockets.values()) {
        socket.disconnect();
    }
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
            socket.broadcast.to(roomId).emit("new-user", user);

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
};

export default registerRankedHandler;
