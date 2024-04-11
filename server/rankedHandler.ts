import type { Socket } from "socket.io";
import type {
    Replay,
    MatchUser,
    RankedRoomWithSocketInfo,
    NewActionPayload,
    RankedRoom,
    TextCategory,
} from "../src/lib/types";

import { client } from "../src/lib/server/auth/clients";
import { calculateWpm } from "../src/lib/utils/stats";
import {
    getCompletedAndIncorrectWords,
    convertReplayToWords,
} from "../src/lib/utils/textProcessing";
import { rankedQueue, rankedRooms } from "./state";
import { START_TIME_LENIENCY } from "../src/lib/config";

const BEST_OF = 3;
const COUNTDOWN_TIME = 6 * 1000;

const K_FACTOR = 32;

const RATING_SEARCH_STEP = 100;
const SEARCHING_TIME_PER_STEP = 15; // seconds
const SEARCHING_TIME_STEP_MULTIPLIER = 2;

const removeSocketInformationFromRankedRoom = (
    room: RankedRoomWithSocketInfo
): RankedRoom => {
    return {
        id: room.id,
        quote: room.quote,
        startTime: room.startTime,
        users: room.users,
        matchType: room.matchType,
        scores: room.scores,
        userBlacklistedTextTypes: room.userBlacklistedTextTypes,
    };
};

const addUserToRankedRoom = (
    user: MatchUser,
    socket: Socket,
    room: RankedRoomWithSocketInfo
) => {
    const newRoomInfo = {
        ...room,
        users: { ...room.users, [user.id]: user },
        sockets: new Map([...room.sockets, [user.id, socket]]),
        scores: { ...room.scores, [user.id]: 0 },
    } satisfies RankedRoomWithSocketInfo;

    return newRoomInfo;
};

export const handleIfRankedMatchOver = async (
    room: RankedRoomWithSocketInfo,
    socket: Socket,
    force = false
) => {
    const quote = room.quote;

    if (!quote) return;

    let matchWinner: string | null = null;

    const user1 = Object.values(room.users)[0];
    const user2 = Object.values(room.users)[1];

    if (!user1.connected) {
        matchWinner = user2.id;
    } else if (!user2.connected) {
        matchWinner = user1.id;
    }

    if (!matchWinner) {
        const getWpmFromReplay = (replay: Replay) => {
            const startTime = Math.min(
                replay[0]?.timestamp,
                (room.startTime as number) + START_TIME_LENIENCY
            );

            const { completedWords } = getCompletedAndIncorrectWords(
                convertReplayToWords(replay, quote),
                quote
            );

            // If the user has not finished yet
            if (completedWords.length !== quote.join(" ").length) {
                return 0;
            }

            return calculateWpm(
                replay[replay.length - 1]?.timestamp,
                startTime,
                completedWords.length
            );
        };

        const user1Wpm = getWpmFromReplay(user1.replay);
        const user2Wpm = getWpmFromReplay(user2.replay);

        // Checking if neither user has finished
        if (user1Wpm === 0 && user2Wpm === 0) {
            return;
        }

        if (user1Wpm > user2Wpm) {
            room.scores[user1.id] += 1;
        } else {
            room.scores[user2.id] += 1;
        }

        const winningScore = Math.ceil(BEST_OF / 2);

        if (room.scores[user1.id] === winningScore) {
            matchWinner = user1.id;
        } else if (room.scores[user2.id] === winningScore) {
            matchWinner = user2.id;
        }
    }

    // If the match is not entirely over (i.e moving to the next round)
    if (matchWinner === null) {
        // Resetting the replays
        user1.replay = [];
        user2.replay = [];

        room.users[user1.id] = user1;
        room.users[user2.id] = user2;

        room.startTime = Date.now() + COUNTDOWN_TIME;
        room.quote = "hello how are you doing".split(" ");

        socket.emit(
            "ranked:update-room-info",
            removeSocketInformationFromRankedRoom(room)
        );

        socket.broadcast
            .to(room.id)
            .emit(
                "ranked:update-room-info",
                removeSocketInformationFromRankedRoom(room)
            );

        return;
    }

    rankedRooms.delete(room.id);

    const [winner, loser] =
        matchWinner === user1.id ? [user1, user2] : [user2, user1];

    // Handling the match being completely over
    const winnerChance =
        1.0 / (1.0 + Math.pow(10, (loser.rating - winner.rating) / 400));

    const loserChance =
        1.0 / (1.0 + Math.pow(10, (winner.rating - loser.rating) / 400));

    const winnerNewRating = Math.round(
        winner.rating + K_FACTOR * (1 - winnerChance)
    );
    const loserNewRating = Math.round(
        loser.rating + K_FACTOR * (0 - loserChance)
    );

    if (winner.id === user1.id) {
        user1.rating = winnerNewRating;
        user2.rating = loserNewRating;
    } else {
        user1.rating = loserNewRating;
        user2.rating = winnerNewRating;
    }

    room.users[user1.id] = user1;
    room.users[user2.id] = user2;

    socket.emit(
        "ranked:update-room-info",
        removeSocketInformationFromRankedRoom(room)
    );

    socket.broadcast
        .to(room.id)
        .emit(
            "ranked:update-room-info",
            removeSocketInformationFromRankedRoom(room)
        );

    // Update the rating for each match user in the database
    Object.values(room.users).forEach(async (user) => {
        // TODO: add property error handling
        try {
            await client.user.update({
                where: { id: user.id },
                data: {
                    rating: user.rating,
                },
            });
        } catch (e) {
            console.log(e);
        }
    });

    // Disconnect all the users and delete the room
    for (const socket of room.sockets.values()) {
        socket.disconnect();
    }
};

const registerRankedHandler = (socket: Socket, user: MatchUser) => {
    let hasUserJoinedARoom = false;

    rankedQueue.set(user.id, {
        user,
        socket,
    });

    let minRating = Math.round(user.rating / 100) * 100;
    let maxRating = Math.round(user.rating / 100) * 100;

    const startSearchingTime = Date.now();
    let searchingStepTime = SEARCHING_TIME_PER_STEP;

    const searchForOpponent = () => {
        const secondsPassed = Math.floor(
            (Date.now() - startSearchingTime) / 1000
        );

        if (secondsPassed % searchingStepTime === 0) {
            if (minRating !== 0) {
                minRating -= RATING_SEARCH_STEP;
            }

            maxRating += RATING_SEARCH_STEP;

            searchingStepTime = Math.ceil(
                searchingStepTime * SEARCHING_TIME_STEP_MULTIPLIER
            );
        }

        socket.emit("ranked:waiting-for-match", [minRating, maxRating]);

        for (const {
            user: queuedUser,
            socket: queuedUserSocket,
        } of rankedQueue.values()) {
            if (queuedUser.id === user.id) continue;

            // Checking if the opponent is outside the rating range
            if (
                queuedUser.rating < minRating ||
                queuedUser.rating > maxRating
            ) {
                continue;
            }

            const roomId = Math.random().toString(36).substring(2, 8);

            let room: RankedRoomWithSocketInfo = {
                matchType: "ranked",
                id: roomId,
                users: {},
                quote: null,
                startTime: null,
                scores: {},
                userBlacklistedTextTypes: {},
                sockets: new Map(),
            };

            // Removing the users from the queue
            rankedQueue.delete(user.id);
            rankedQueue.delete(queuedUser.id);

            room = addUserToRankedRoom(user, socket, room);
            room = addUserToRankedRoom(queuedUser, socket, room);

            rankedRooms.set(roomId, room);

            socket.join(roomId);
            queuedUserSocket.join(roomId);

            socket.emit(
                "ranked:new-room-info",
                removeSocketInformationFromRankedRoom(room)
            );

            socket.broadcast
                .to(roomId)
                .emit(
                    "ranked:new-room-info",
                    removeSocketInformationFromRankedRoom(room)
                );

            hasUserJoinedARoom = true;

            break;
        }

        if (hasUserJoinedARoom) {
            clearInterval(interval);
        }
    };

    const interval = setInterval(() => {
        searchForOpponent();
    }, 1000);

    // Running once initially to circumvent the setInterval delay
    searchForOpponent();

    socket.on("ranked:eliminate", (textCategory: TextCategory) => {});

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

    // When the client disconnects
    socket.on("disconnect", async () => {
        const userInQueue = rankedQueue.delete(user.id);

        if (userInQueue) return;

        for (const [roomId, room] of rankedRooms) {
            if (!(user.id in room.users)) {
                return;
            }

            room.users[user.id].connected = false;

            socket.broadcast.to(roomId).emit("user-disconnect", user.id);

            await handleIfRankedMatchOver(
                room as RankedRoomWithSocketInfo,
                socket
            );
        }
    });
};

export default registerRankedHandler;
