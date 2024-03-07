import type { RoomWithSocketInfo } from "../src/lib/types";

export const rankedRooms = new Map<string, RoomWithSocketInfo>();
export const casualRooms = new Map<string, RoomWithSocketInfo>();

export const checkIfUserIsInRoom = (userId: string) => {
    for (const room of [...rankedRooms.values(), ...casualRooms.values()]) {
        if (room.sockets.has(userId) && room.users[userId].connected) {
            return true;
        }
    }

    return false;
};
