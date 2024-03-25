import type { Socket } from "socket.io";
import type {
    Replay,
    MatchUser,
    RoomWithSocketInfo,
    NewActionPayload,
} from "../src/lib/types";

import { client } from "../src/lib/server/auth";
import { calculateWpm } from "../src/lib/utils/stats";
import {
    getCompletedAndIncorrectWords,
    convertReplayToWords,
} from "../src/lib/utils/textProcessing";
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
    force = false
) => {
    if (!room) {
        return;
    }

    if (!force) {
        const totalUsersFinished = Object.values(room.users).reduce(
            (count, user) => {
                if (user.connected === false) return count + 1;

                const { completedWords } = getCompletedAndIncorrectWords(
                    convertReplayToWords(user.replay, room.quote),
                    room.quote
                );

                if (completedWords.length === room.quote.join(" ").length) {
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

        const { completedWords } = getCompletedAndIncorrectWords(
            convertReplayToWords(replay, room.quote),
            room.quote
        );

        return calculateWpm(endTime, startTime, completedWords.length);
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
        // TODO: add property error handling
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
            const newRoomInfo = {
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
            "You're finally granted a chance to get even! And if you don't take it... then you're no better than a puppy who cowers when someone takes the leash off.".split(
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

    // New typing action from the user
    socket.on("new-action", async (newActionPayload: NewActionPayload) => {
        // Disconnecting users who send actions on behalf of others
        if (newActionPayload.userId !== user.id) {
            socket.emit("error", "You cannot send actions on behalf of others");
            socket.disconnect();
            return;
        }

        const roomId = Array.from(socket.rooms.values())[1];

        const room = rankedRooms.get(roomId);

        // Disconnecting a user if they are not in the room
        if (!room || !(newActionPayload.userId in room.users)) {
            socket.emit(
                "error",
                "Something unexpected happened, please refresh"
            );
            socket.disconnect();
            return;
        }

        // Disconnecting a user if they start before the countdown
        if (
            user.replay.length === 0 &&
            room.startTime &&
            room.startTime > newActionPayload.actions[0].timestamp
        ) {
            socket.emit("error", "You started before the countdown!");
            socket.disconnect();
            return;
        }

        // Adding the new action to the user's replay
        user.replay = user.replay.concat(newActionPayload.actions);

        room.users[user.id] = user;

        socket.broadcast.to(roomId).emit("new-action", newActionPayload);

        await handleIfRankedMatchOver(room, socket);
    });
};

export default registerRankedHandler;
