import type { Socket } from "socket.io";
import type {
    MatchUser,
    NewActionPayload,
    RoomWithSocketInfo,
} from "../src/lib/types";
import {
    getCompletedAndIncorrectWords,
    convertReplayToText,
} from "../src/lib/utils";
import { casualRooms } from "./state";
import { removeSocketInformationFromRoom } from "./utils";

const MAX_ROOM_SIZE = 5;
const COUNTDOWN_TIME = 7 * 1000;
const MIN_JOIN_COUNTDOWN_TIME = 3 * 1000;

export const handleIfCasualMatchOver = async (
    room: RoomWithSocketInfo,
    force: boolean = false
) => {
    if (!force) {
        const allUsersFinished = Object.values(room.users).every((user) => {
            if (user.connected === false) return true;

            const { completedWords } = getCompletedAndIncorrectWords(
                convertReplayToText(user.replay),
                room.quote
            );

            return completedWords.length === room.quote.join(" ").length;
        });

        if (!allUsersFinished) {
            return;
        }
    }

    casualRooms.delete(room.roomId);

    // Disconnect all the users and delete the room
    for (const socket of room.sockets.values()) {
        socket.disconnect();
    }
};

const registerCasualHandler = (socket: Socket, user: MatchUser) => {
    let joinedRoom = false;

    for (const [roomId, room] of casualRooms) {
        // If the room is not full and the countdown has not started
        if (
            Object.keys(room.users).length < MAX_ROOM_SIZE &&
            (!room.startTime ||
                room.startTime > Date.now() + MIN_JOIN_COUNTDOWN_TIME)
        ) {
            casualRooms.set(roomId, {
                ...room,
                users: { ...room.users, [user.id]: user },
                sockets: new Map([...room.sockets, [user.id, socket]]),
            });
            socket.join(roomId);
            joinedRoom = true;

            socket.broadcast.to(roomId).emit("new-user", user);
            socket.emit(
                "existing-room-info",
                removeSocketInformationFromRoom(room, user.id)
            );

            break;
        }
    }

    // Creating a new room if there are no available rooms
    if (!joinedRoom) {
        const roomId = Math.random().toString(36).substring(2, 8);

        const quote =
            "power power power power power power power power power power power power power power power power power power power power power power power power power power power power power power".split(
                " "
            );

        const room: RoomWithSocketInfo = {
            roomId,
            users: { [user.id]: user },
            quote,
            startTime: Date.now() + COUNTDOWN_TIME,
            sockets: new Map([[user.id, socket]]),
            matchType: "casual",
        };

        socket.emit(
            "existing-room-info",
            removeSocketInformationFromRoom(room, user.id)
        );

        casualRooms.set(roomId, room);
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

        const room = casualRooms.get(roomId);

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

        await handleIfCasualMatchOver(room);
    });
};

export default registerCasualHandler;
