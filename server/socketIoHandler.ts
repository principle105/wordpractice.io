import { Server, Socket } from "socket.io";
import type { ViteDevServer } from "vite";
import { auth } from "../src/lib/server/lucia";
import type { Room, MatchUser, Replay } from "../src/lib/types";
import type { Session } from "lucia";

const MAX_ROOM_SIZE = 5;
const COUNTDOWN_TIME = 6 * 1000;
const MIN_JOIN_COUNTDOWN_TIME = 3 * 1000;
const WORD_LIST = [
    "the",
    "be",
    "of",
    "and",
    "a",
    "to",
    "in",
    "he",
    "have",
    "it",
    "that",
    "for",
    "they",
    "I",
    "with",
    "as",
    "not",
    "on",
    "she",
    "at",
    "by",
    "this",
    "we",
    "you",
    "do",
    "but",
    "from",
    "or",
    "which",
    "one",
    "would",
    "all",
    "will",
    "there",
    "say",
    "who",
    "make",
    "when",
    "can",
    "more",
    "if",
    "no",
    "man",
    "out",
    "other",
    "so",
    "what",
    "time",
    "up",
    "go",
    "about",
    "than",
    "into",
    "could",
    "state",
    "only",
    "new",
    "year",
    "some",
    "take",
    "come",
    "these",
    "know",
    "see",
    "use",
    "get",
    "like",
    "then",
    "first",
    "any",
    "work",
    "now",
    "may",
    "such",
    "give",
    "over",
    "think",
    "most",
    "even",
    "find",
    "day",
    "also",
    "after",
    "way",
    "many",
    "must",
    "look",
    "before",
    "great",
    "back",
    "through",
    "long",
    "where",
    "much",
    "should",
    "well",
    "people",
    "down",
    "own",
    "just",
    "because",
    "good",
    "each",
    "those",
    "feel",
    "seem",
    "how",
    "high",
    "too",
    "place",
    "little",
    "world",
    "very",
    "still",
    "nation",
    "hand",
    "old",
    "life",
    "tell",
    "write",
    "become",
    "here",
    "show",
    "house",
    "both",
    "between",
    "need",
    "mean",
    "call",
    "develop",
    "under",
    "last",
    "right",
    "move",
    "thing",
    "general",
    "school",
    "never",
    "same",
    "another",
    "begin",
    "while",
    "number",
    "part",
    "turn",
    "real",
    "leave",
    "might",
    "want",
    "point",
    "form",
    "off",
    "child",
    "few",
    "small",
    "since",
    "against",
    "ask",
    "late",
    "home",
    "interest",
    "large",
    "person",
    "end",
    "open",
    "public",
    "follow",
    "during",
    "present",
    "without",
    "again",
    "hold",
    "govern",
    "around",
    "possible",
    "head",
    "consider",
    "word",
    "program",
    "problem",
    "however",
    "lead",
    "system",
    "set",
    "order",
    "eye",
    "plan",
    "run",
    "keep",
    "face",
    "fact",
    "group",
    "play",
    "stand",
    "increase",
    "early",
    "course",
    "change",
    "help",
    "line",
];

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

const generateWordList = (length: number) => {
    const words: string[] = [];
    for (let i = 0; i < length; i++) {
        words.push(WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)]);
    }
    return words;
};

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
        };

        for (const [roomId, room] of rooms) {
            if (
                Object.keys(room.users).length < MAX_ROOM_SIZE &&
                room.startTime > Date.now() + MIN_JOIN_COUNTDOWN_TIME
            ) {
                room.users[userId] = user;
                socket.join(roomId);
                joinedRoom = true;

                socket.broadcast.to(roomId).emit("server-update-user", user);

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
            // const quote = generateWordList(30);

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

        socket.on("client-update-user", (replay: Replay) => {
            const roomId = Array.from(socket.rooms.values())[1];

            const room = rooms.get(roomId);

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

            socket.broadcast.to(roomId).emit("server-update-user", user);
        });

        // When the client disconnects
        socket.on("disconnect", () => {
            for (const [roomId, room] of rooms) {
                if (!(userId in room.users)) return;

                delete room.users[userId];
                room.sockets.delete(userId);

                if (Object.keys(room.users).length === 0) {
                    rooms.delete(roomId);
                } else {
                    socket.broadcast
                        .to(roomId)
                        .emit("user-disconnect", user.id);
                }
                break;
            }
        });
    });
};

export default injectSocketIO;
