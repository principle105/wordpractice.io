import type { Socket } from "socket.io";
import type {
    Replay,
    MatchUser,
    Room,
    RoomWithSocketInfo,
} from "../src/lib/types";
import { getCorrect, convertReplayToText } from "../src/lib/utils";
import { rankedRooms } from "./state";

const MAX_ROOM_SIZE = 5;
const COUNTDOWN_TIME = 6 * 1000;
const MIN_JOIN_COUNTDOWN_TIME = 3 * 1000;

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

const registerCasualHandler = (socket: Socket, user: MatchUser) => {
    let joinedRoom = false;

    for (const [roomId, room] of rankedRooms) {
        // If the room is not full and the countdown has not started
        if (
            Object.keys(room.users).length < MAX_ROOM_SIZE &&
            (!room.startTime ||
                room.startTime > Date.now() + MIN_JOIN_COUNTDOWN_TIME)
        ) {
            rankedRooms.set(roomId, {
                ...room,
                users: { ...room.users, [user.id]: user },
                sockets: new Map([...room.sockets, [user.id, socket]]),
            });
            socket.join(roomId);
            joinedRoom = true;

            socket.broadcast.to(roomId).emit("update-user", user);
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

        rankedRooms.set(roomId, room);
        socket.join(roomId);
    }

    const handleIfCasualMatchOver = async (room: RoomWithSocketInfo) => {
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

        await handleIfCasualMatchOver(room);
    });

    // When the client disconnects
    socket.on("disconnect", async () => {
        for (const [roomId, room] of rankedRooms) {
            if (!(user.id in room.users)) return;

            room.users[user.id].connected = false;

            socket.broadcast.to(roomId).emit("user-disconnect", user.id);

            await handleIfCasualMatchOver(room);
            break;
        }
    });
};

export default registerCasualHandler;
