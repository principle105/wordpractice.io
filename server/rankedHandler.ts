import type { Socket } from "socket.io";
import type {
    Replay,
    MatchUser,
    RankedRoomWithSocketInfo,
    NewActionPayload,
    RankedRoom,
} from "../src/lib/types";

import { client } from "../src/lib/server/auth/clients";
import { calculateWpm } from "../src/lib/utils/stats";
import {
    getCompletedAndIncorrectWords,
    convertReplayToWords,
} from "../src/lib/utils/textProcessing";
import { rankedRooms } from "./state";
import { START_TIME_LENIENCY } from "../src/lib/config";

const BEST_OF = 3;
const COUNTDOWN_TIME = 6 * 1000;

const K_FACTOR = 32;

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
            "ranked:next-round",
            removeSocketInformationFromRankedRoom(room)
        );

        socket.broadcast
            .to(room.id)
            .emit(
                "ranked:next-round",
                removeSocketInformationFromRankedRoom(room)
            );

        return;
    }

    // rankedRooms.delete(room.id);

    // const [winner, loser] =
    //     matchWinner === user1.id ? [user1, user2] : [user2, user1];

    // // Handling the match being completely over
    // const winnerChance =
    //     1.0 / (1.0 + Math.pow(10, (loser.rating - winner.rating) / 400));

    // const loserChance =
    //     1.0 / (1.0 + Math.pow(10, (winner.rating - loser.rating) / 400));

    // const winnerNewRating = Math.round(
    //     winner.rating + K_FACTOR * (1 - winnerChance)
    // );
    // const loserNewRating = Math.round(
    //     loser.rating + K_FACTOR * (0 - loserChance)
    // );

    // if (winner.id === user1.id) {
    //     user1.rating = winnerNewRating;
    //     user2.rating = loserNewRating;
    // } else {
    //     user1.rating = loserNewRating;
    //     user2.rating = winnerNewRating;
    // }

    // // Update the rating for each match user in the database
    // Object.values(room.users).forEach(async (user) => {
    //     // TODO: add property error handling
    //     try {
    //         await client.user.update({
    //             where: { id: user.id },
    //             data: {
    //                 rating: user.rating,
    //             },
    //         });
    //     } catch (e) {
    //         console.log(e);
    //     }
    // });

    // // Disconnect all the users and delete the room
    // for (const socket of room.sockets.values()) {
    //     socket.disconnect();
    // }
};

const registerRankedHandler = (socket: Socket, user: MatchUser) => {
    let hasUserJoinedARoom = false;

    for (const [roomId, room] of rankedRooms) {
        // Checking if the room already has two users
        if (Object.keys(room.users).length > 1) {
            continue;
        }

        const newRoomInfo = addUserToRankedRoom(user, socket, room);

        const quote = "power power power".split(" ");

        newRoomInfo.quote = quote;
        newRoomInfo.startTime = Date.now() + COUNTDOWN_TIME;

        socket.emit(
            "ranked:new-room-info",
            removeSocketInformationFromRankedRoom(newRoomInfo)
        );

        socket.broadcast
            .to(roomId)
            .emit(
                "ranked:new-room-info",
                removeSocketInformationFromRankedRoom(newRoomInfo)
            );

        rankedRooms.set(roomId, newRoomInfo);
        socket.join(roomId);

        hasUserJoinedARoom = true;

        break;
    }

    // Creating a new room if there are no available rooms
    if (!hasUserJoinedARoom) {
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

        room = addUserToRankedRoom(user, socket, room);

        socket.emit(
            "ranked:new-room-info",
            removeSocketInformationFromRankedRoom(room)
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
