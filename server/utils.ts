import type { RoomWithSocketInfo, Room } from "../src/lib/types";

export const removeSocketInformationFromRoom = (
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
