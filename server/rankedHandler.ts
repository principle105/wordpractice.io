import type { Socket } from "socket.io";
import type {
    RankedMatchUser,
    NewActionPayload,
    RankedRoom,
    TextCategory,
    RankedRoomPayload,
    UserProfile,
} from "../src/lib/types";

import { client } from "../src/lib/server/auth/clients";
import { calculateWpm } from "../src/lib/utils/stats";
import {
    getCompletedAndIncorrectWords,
    convertReplayToWords,
} from "../src/lib/utils/textProcessing";
import { rankedQueue, rankedRooms } from "./state";
import { START_TIME_LENIENCY } from "../src/lib/config";
import { getQuoteFromCategory } from "../data";
import { textCategories } from "../src/lib/constants";

const BEST_OF = 3;
const COUNTDOWN_TIME = 6 * 1000;

const K_FACTOR = 32;

const RATING_SEARCH_STEP = 100;
const BASE_SEARCHING_TIME_PER_STEP = 1; // seconds
const SEARCHING_TIME_STEP_MULTIPLIER = 1.5;

const MAX_DECISION_MAKING_TIME = 20 * 1000;

const getRankedRoomPayload = (room: RankedRoom): RankedRoomPayload => {
    const { sockets, ...newRoom } = room;

    return newRoom;
};

const addUserToRankedRoom = (
    user: RankedMatchUser,
    userSocket: Socket,
    room: RankedRoom
) => {
    const newRoomInfo = {
        ...room,
        users: { ...room.users, [user.id]: user },
        sockets: new Map([...room.sockets, [user.id, userSocket]]),
    };

    return newRoomInfo;
};

const handleTextCategoryElimination = (
    socket: Socket,
    room: RankedRoom,
    textCategory: TextCategory
) => {
    room.blacklistedTextCategories.push(textCategory);

    room.blacklistDecisionEndTime = null;
    room.quoteSelectionDecisionEndTime = Date.now() + MAX_DECISION_MAKING_TIME;

    rankedRooms.set(room.id, room);

    socket.emit("ranked:update-room-info", getRankedRoomPayload(room));
    socket.broadcast
        .to(room.id)
        .emit("ranked:update-room-info", getRankedRoomPayload(room));
};

const handleTextCategorySelection = async (
    socket: Socket,
    room: RankedRoom,
    textCategory: TextCategory
) => {
    const quote = await getQuoteFromCategory(textCategory);

    if (!quote) {
        socket.emit("error", "Something went wrong, please try again");
        return;
    }

    room.quote = quote.text.split(" ");
    room.startTime = Date.now() + COUNTDOWN_TIME;

    rankedRooms.set(room.id, room);

    socket.emit("ranked:update-room-info", getRankedRoomPayload(room));
    socket.broadcast
        .to(room.id)
        .emit("ranked:update-room-info", getRankedRoomPayload(room));
};

export const handleIfRankedMatchOver = async (
    room: RankedRoom,
    socket: Socket,
    force = false
) => {
    let matchWinner: string | null = null;

    const user1 = Object.values(room.users)[0];
    const user2 = Object.values(room.users)[1];

    if (!user1.connected) {
        matchWinner = user2.id;
    } else if (!user2.connected) {
        matchWinner = user1.id;
    }

    if (!matchWinner) {
        const quote = room.quote;

        if (!quote) return;

        const { completedWords: user1CompletedWords } =
            getCompletedAndIncorrectWords(
                convertReplayToWords(user1.replay, quote),
                quote
            );

        const { completedWords: user2CompletedWords } =
            getCompletedAndIncorrectWords(
                convertReplayToWords(user2.replay, quote),
                quote
            );

        const quoteLength = quote.join(" ").length;

        if (
            user1CompletedWords.length === quoteLength &&
            user2CompletedWords.length !== quoteLength
        ) {
            user1.score += 1;
        } else if (
            user2CompletedWords.length === quoteLength &&
            user1CompletedWords.length !== quoteLength
        ) {
            user2.score += 1;
        } else {
            // Check if neither are finished and the force flag is not set
            if (user1CompletedWords.length !== quoteLength && !force) return;

            // If both are finished
            const user1StartTime = Math.min(
                user1.replay[0]?.timestamp,
                (room.startTime as number) + START_TIME_LENIENCY
            );

            const user2StartTime = Math.min(
                user2.replay[0]?.timestamp,
                (room.startTime as number) + START_TIME_LENIENCY
            );

            const user1Wpm = calculateWpm(
                user1.replay[user1.replay.length - 1]?.timestamp,
                user1StartTime,
                user1CompletedWords.length
            );

            const user2Wpm = calculateWpm(
                user2.replay[user2.replay.length - 1]?.timestamp,
                user2StartTime,
                user2CompletedWords.length
            );

            if (user1Wpm > user2Wpm) {
                user1.score += 1;
            } else {
                user2.score += 1;
            }
        }

        const winningScore = Math.ceil(BEST_OF / 2);

        if (user1.score === winningScore) {
            matchWinner = user1.id;
        } else if (user2.score === winningScore) {
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

        room.startTime = null;
        room.quote = null;

        room.blacklistDecisionEndTime = Date.now() + MAX_DECISION_MAKING_TIME;

        socket.emit("ranked:update-room-info", getRankedRoomPayload(room));

        socket.broadcast
            .to(room.id)
            .emit("ranked:update-room-info", getRankedRoomPayload(room));

        return;
    }

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

    socket.emit("ranked:update-room-info", getRankedRoomPayload(room));

    socket.broadcast
        .to(room.id)
        .emit("ranked:update-room-info", getRankedRoomPayload(room));

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

    rankedRooms.delete(room.id);

    // Disconnect all the users and delete the room
    for (const socket of room.sockets.values()) {
        socket.disconnect();
    }
};

const registerRankedHandler = (socket: Socket, userProfile: UserProfile) => {
    const user: RankedMatchUser = {
        ...userProfile,
        replay: [],
        connected: true,
        score: 0,
    };

    rankedQueue.set(user.id, {
        user,
        socket,
    });

    let minRating = Math.round(user.rating / 100) * 100;
    let maxRating = Math.round(user.rating / 100) * 100;

    const startSearchingTime = Date.now();
    let searchingStepTime = BASE_SEARCHING_TIME_PER_STEP;

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
            user: queuedUserProfile,
            socket: queuedUserSocket,
        } of rankedQueue.values()) {
            if (queuedUserProfile.id === user.id) continue;

            // Checking if the opponent is outside the rating range
            if (
                queuedUserProfile.rating < minRating ||
                queuedUserProfile.rating > maxRating
            ) {
                continue;
            }

            const roomId = Math.random().toString(36).substring(2, 8);

            // Selecting the lower rated user to blacklist first
            const firstUserToBlacklist =
                user.rating < queuedUserProfile.rating
                    ? user.id
                    : queuedUserProfile.id;

            let room: RankedRoom = {
                matchType: "ranked",
                id: roomId,
                users: {},
                quote: null,
                startTime: null,
                blacklistedTextCategories: [],
                sockets: new Map(),
                firstUserToBlacklist,
                blacklistDecisionEndTime: Date.now() + MAX_DECISION_MAKING_TIME,
                quoteSelectionDecisionEndTime: null,
            };

            // Removing the users from the queue
            rankedQueue.delete(user.id);
            rankedQueue.delete(queuedUserProfile.id);

            const queuedUser: RankedMatchUser = {
                ...queuedUserProfile,
                replay: [],
                connected: true,
                score: 0,
            };

            room = addUserToRankedRoom(user, socket, room);
            room = addUserToRankedRoom(queuedUser, queuedUserSocket, room);

            rankedRooms.set(roomId, room);

            socket.join(roomId);
            queuedUserSocket.join(roomId);

            socket.emit("ranked:new-room-info", getRankedRoomPayload(room));

            socket.broadcast
                .to(roomId)
                .emit("ranked:new-room-info", getRankedRoomPayload(room));

            setTimeout(() => {
                // Check if the user has already eliminated a category
                if (room.blacklistDecisionEndTime === null) return;

                const nonEliminatedTextCategories = Object.values(
                    textCategories
                ).filter(
                    (category) =>
                        !room.blacklistedTextCategories.includes(category)
                );

                const randomCategory =
                    nonEliminatedTextCategories[
                        Math.floor(
                            Math.random() * nonEliminatedTextCategories.length
                        )
                    ];

                handleTextCategoryElimination(socket, room, randomCategory);
            }, MAX_DECISION_MAKING_TIME);

            break;
        }

        if (rankedQueue.has(user.id)) {
            setTimeout(() => {
                searchForOpponent();
            }, 1000);
        }
    };

    searchForOpponent();

    socket.on("ranked:elimination", async (textCategory: TextCategory) => {
        const roomId = Array.from(socket.rooms.values())[1];

        const room = rankedRooms.get(roomId);

        if (!room || !(user.id in room.users)) {
            socket.emit(
                "error",
                "Something unexpected happened, please refresh"
            );
            socket.disconnect();
            return;
        }

        if (
            room.blacklistDecisionEndTime === null ||
            Date.now() > room.blacklistDecisionEndTime
        ) {
            socket.emit("error", "The time to blacklist has passed");
            return;
        }

        // TODO: create a util for this
        const roundNumber =
            Object.values(room.users).reduce(
                (acc, curr) => acc + curr.score,
                0
            ) + 1;

        // Check if it's the user's turn to blacklist
        if (
            roundNumber % 2 !==
            (room.firstUserToBlacklist === user.id ? 0 : 1)
        ) {
            socket.emit("error", "It's not your turn to blacklist");
            return;
        }

        if (room.blacklistedTextCategories.includes(textCategory)) {
            socket.emit("error", "You have already blacklisted this category");
            return;
        }

        setTimeout(async () => {
            if (room.quoteSelectionDecisionEndTime) return;

            const nonEliminatedTextCategories = Object.values(
                textCategories
            ).filter(
                (category) => !room.blacklistedTextCategories.includes(category)
            );

            const randomCategory =
                nonEliminatedTextCategories[
                    Math.floor(
                        Math.random() * nonEliminatedTextCategories.length
                    )
                ];

            await handleTextCategorySelection(socket, room, randomCategory);
        }, MAX_DECISION_MAKING_TIME);

        handleTextCategoryElimination(socket, room, textCategory);
    });

    socket.on("ranked:selection", async (textCategory: TextCategory) => {
        const roomId = Array.from(socket.rooms.values())[1];

        const room = rankedRooms.get(roomId);

        if (!room || !(user.id in room.users)) {
            socket.emit(
                "error",
                "Something unexpected happened, please refresh"
            );
            socket.disconnect();
            return;
        }

        if (
            room.quoteSelectionDecisionEndTime === null ||
            Date.now() > room.quoteSelectionDecisionEndTime
        ) {
            socket.emit("error", "The time to select your quote has passed");
            return;
        }

        if (room.blacklistedTextCategories.includes(textCategory)) {
            socket.emit("error", "That category has been blacklisted");
            return;
        }

        const roundNumber =
            Object.values(room.users).reduce(
                (acc, curr) => acc + curr.score,
                0
            ) + 1;

        // Check if the other user has not already blacklisted a category
        if (room.blacklistedTextCategories.length !== roundNumber) {
            socket.emit(
                "error",
                "Wait for the other user to blacklist a category"
            );
            return;
        }

        // Check if it's the user's turn to select a quote
        if (
            roundNumber % 2 ===
            (room.firstUserToBlacklist === user.id ? 0 : 1)
        ) {
            socket.emit("error", "It's not your turn to select a quote");
            return;
        }

        await handleTextCategorySelection(socket, room, textCategory);
    });

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
        rankedQueue.delete(user.id);

        for (const [roomId, room] of rankedRooms) {
            if (!(user.id in room.users)) continue;

            room.users[user.id].connected = false;

            socket.broadcast.to(roomId).emit("user-disconnect", user.id);

            await handleIfRankedMatchOver(room, socket);
        }
    });
};

export default registerRankedHandler;
