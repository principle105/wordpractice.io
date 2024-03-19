import type { Socket } from "socket.io";
import type { MatchUser, RoomWithSocketInfo } from "../src/lib/types";
import { getCorrect, convertReplayToText } from "../src/lib/utils";
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

            const correctInput = getCorrect(
                convertReplayToText(user.replay),
                room.quote
            ).correct;

            return correctInput.length === room.quote.join(" ").length;
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

        const quote = "This is a casual match".split(" ");

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
};

export default registerCasualHandler;
