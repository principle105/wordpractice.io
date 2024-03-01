import type { RoomWithSocketInfo } from "../src/lib/types";

export const rankedRooms = new Map<string, RoomWithSocketInfo>();
export const casualRooms = new Map<string, RoomWithSocketInfo>();

export const checkIfUserIsInRoom = (
    userId: string,
    ipAddress: string | null = null
) => {
    for (const room of [...rankedRooms.values(), ...casualRooms.values()]) {
        if (room.sockets.has(userId) && room.users[userId].connected) {
            return true;
        }

        if (ipAddress) {
            for (const socket of room.sockets.values()) {
                if (socket.handshake.address === ipAddress) {
                    return true;
                }
            }
        }
    }

    return false;
};
