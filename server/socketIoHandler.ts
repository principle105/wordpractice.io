import { Server, Socket } from "socket.io";
import type { ViteDevServer } from "vite";
import { auth } from "../src/lib/server/lucia";
import type {
    ExistingRoom,
    MatchUser,
    Replay,
    RoomInfo,
} from "../src/lib/types";
import type { Session } from "lucia";

const MAX_ROOM_SIZE = 5;
const COUNTDOWN_TIME = 8 * 1000;

export interface RoomUser {
    matchInfo: MatchUser;
    socket: Socket;
}

export interface Room extends RoomInfo {
    roomId: string;
    users: RoomUser[];
}

const getRandomString = () => {
    return Math.random().toString(36).substring(2, 8);
};

const removeUnnecessaryRoomInfo = (
    room: Room,
    socketId: string
): ExistingRoom => {
    const users = room.users
        .filter((u) => u.socket.id !== socketId)
        .map((u) => u.matchInfo);

    return {
        quote: room.quote,
        startTime: room.startTime,
        users,
    };
};

const injectSocketIO = (server: ViteDevServer["httpServer"]) => {
    if (!server) return;

    const io = new Server(server);
    const rooms = new Map<string, Room>();

    io.on("connection", async (socket) => {
        const token = socket.handshake.query.token as string;

        let session: Session | null = null;

        if (token) {
            try {
                session = await auth.validateSession(token);
            } catch (e) {
                session = null;
            }
        }

        const username: string = session ? session.user.name : "Guest";
        const userId: string = session ? session.user.id : getRandomString();
        let joinedRoom = false;

        let user: RoomUser = {
            matchInfo: {
                id: userId,
                name: username,
                replay: [],
            },
            socket,
        };

        for (const [roomId, room] of rooms) {
            if (room.users.length < MAX_ROOM_SIZE) {
                room.users.push(user);
                socket.join(roomId);
                joinedRoom = true;
                console.log(`User joined room ${roomId}`);

                socket.broadcast
                    .to(roomId)
                    .emit("server-update-user", user.matchInfo);

                socket.emit(
                    "existing-room-info",
                    removeUnnecessaryRoomInfo(room, socket.id)
                );

                break;
            }
        }

        if (!joinedRoom) {
            const roomId = Math.random().toString(36).substring(2, 8);
            const room: Room = {
                roomId,
                users: [user],
                quote: "what is the power of the person and what is the power of the person".split(
                    " "
                ),
                startTime: Date.now() + COUNTDOWN_TIME,
            };

            socket.emit(
                "existing-room-info",
                removeUnnecessaryRoomInfo(room, socket.id)
            );

            rooms.set(roomId, room);
            socket.join(roomId);
            console.log(`User created and joined room ${roomId}`);
        }

        socket.on("client-update-user", (replay: Replay) => {
            const roomId = Array.from(socket.rooms.values())[1];

            const room = rooms.get(roomId);
            if (!room || room.users.length <= 1) return;

            const index = room.users.findIndex(
                (user) => user.socket === socket
            );

            if (index === -1) return;

            // Disconnecting a user if they start before the countdown
            if (room.startTime > Date.now()) {
                room.users[index].socket.disconnect();
                return;
            }

            room.users[index].matchInfo.replay = replay;

            user = room.users[index];

            socket.broadcast
                .to(roomId)
                .emit("server-update-user", user.matchInfo);
        });

        // When the client disconnects
        socket.on("disconnect", () => {
            console.log("Got disconnect!");
            for (const [roomId, room] of rooms) {
                const index = room.users.findIndex(
                    (user) => user.socket === socket
                );
                if (index !== -1) {
                    room.users.splice(index, 1);
                    console.log(`User left room ${roomId}`);
                    if (room.users.length === 0) {
                        rooms.delete(roomId);
                        console.log(`Room ${roomId} deleted`);
                    } else {
                        socket.broadcast
                            .to(roomId)
                            .emit("user-disconnect", user.matchInfo.id);
                    }
                    break;
                }
            }
        });
    });
};

export default injectSocketIO;
