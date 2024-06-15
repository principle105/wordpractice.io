import type { Socket } from "socket.io";
import type {
    CasualMatchUser,
    NewActionPayload,
    CasualRoomPayload,
    CasualRoom,
    UserProfile,
} from "../src/lib/types";
import {
    getCompletedAndIncorrectWords,
    convertReplayToWords,
} from "../src/lib/utils/textProcessing";
import { casualRooms } from "./state";

const MAX_ROOM_SIZE = 5;
const COUNTDOWN_TIME = 7 * 1000;
const MIN_JOIN_COUNTDOWN_TIME = 3 * 1000;

const getCasualRoomPayload = (room: CasualRoom): CasualRoomPayload => {
    const { sockets, ...newRoom } = room;

    return newRoom;
};

const addUserToCasualRoom = (
    user: CasualMatchUser,
    socket: Socket,
    room: CasualRoom
) => {
    const newRoomInfo = {
        ...room,
        users: { ...room.users, [user.id]: user },
        sockets: new Map([...room.sockets, [user.id, socket]]),
        startTime: room.startTime ?? Date.now() + COUNTDOWN_TIME,
    };

    return newRoomInfo;
};

export const handleIfCasualMatchOver = async (
    room: CasualRoom,
    force = false
) => {
    const quote = room.quote;

    if (!quote) return;

    if (!force) {
        const areAllUsersFinished = Object.values(room.users).every((user) => {
            if (user.connected === false) return true;

            const { completedWords } = getCompletedAndIncorrectWords(
                convertReplayToWords(user.replay, quote),
                quote
            );

            const isUserFinished =
                completedWords.length === quote.join(" ").length;

            return isUserFinished;
        });

        if (!areAllUsersFinished) {
            return;
        }
    }

    casualRooms.delete(room.id);

    // Disconnect all the users and delete the room
    for (const socket of room.sockets.values()) {
        socket.disconnect();
    }
};

const registerCasualHandler = (socket: Socket, userProfile: UserProfile) => {
    const user: CasualMatchUser = {
        ...userProfile,
        replay: [],
        connected: true,
    };

    let hasUserJoinedARoom = false;

    for (const [roomId, room] of casualRooms) {
        // Checking if the room is full
        if (Object.keys(room.users).length >= MAX_ROOM_SIZE) {
            continue;
        }

        // Checking if the countdown has started
        if (
            room.startTime &&
            room.startTime <= Date.now() + MIN_JOIN_COUNTDOWN_TIME
        ) {
            continue;
        }

        const newRoomInfo = addUserToCasualRoom(user, socket, room);

        casualRooms.set(roomId, newRoomInfo);

        socket.join(roomId);
        hasUserJoinedARoom = true;

        socket.broadcast.to(roomId).emit("casual:new-user", user);
        socket.emit("casual:new-room-info", getCasualRoomPayload(room));

        break;
    }

    // Creating a new room if there are no available rooms
    if (!hasUserJoinedARoom) {
        const roomId = Math.random().toString(36).substring(2, 8);

        const quote =
            "The thing about a story is that you dream it as you tell it, hoping that others might then dream along with you, and in this way memory and imagination and language combine to make spirits in the head. There is the illusion of aliveness.".split(
                " "
            );

        const room: CasualRoom = {
            matchType: "casual",
            id: roomId,
            users: { [user.id]: user },
            quote,
            startTime: Date.now() + COUNTDOWN_TIME,
            sockets: new Map([[user.id, socket]]),
        };

        socket.emit("casual:new-room-info", getCasualRoomPayload(room));

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

    // When the client disconnects
    socket.on("disconnect", async () => {
        for (const [roomId, room] of casualRooms) {
            if (!(user.id in room.users)) continue;

            room.users[user.id].connected = false;

            socket.broadcast.to(roomId).emit("user-disconnect", user.id);

            await handleIfCasualMatchOver(room);
        }
    });
};

export default registerCasualHandler;
