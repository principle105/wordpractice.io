import type { MatchType, RoomWithSocketInfo } from "../src/lib/types";

export const rankedRooms = new Map<string, RoomWithSocketInfo>();
export const casualRooms = new Map<string, RoomWithSocketInfo>();

export const checkIfUserIsInRoom = (userId: string) => {
    for (const room of rankedRooms.values()) {
        if (room.sockets.has(userId)) return true;
    }

    for (const room of casualRooms.values()) {
        if (room.sockets.has(userId)) return true;
    }

    return false;
};
