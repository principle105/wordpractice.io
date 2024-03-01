import type { RoomWithSocketInfo } from "../src/lib/types";

export const rankedRooms = new Map<string, RoomWithSocketInfo>();
export const casualRooms = new Map<string, RoomWithSocketInfo>();

export const checkIfUserIsInRoom = (
    userId: string,
    ipAddress: string | null = null
) => {
    for (const room of [...rankedRooms.values(), ...casualRooms.values()]) {
        if (room.sockets.has(userId)) return true;

        if (ipAddress) {
            room.sockets.forEach((socket) => {
                if (socket.handshake.address === ipAddress) {
                    return true;
                }
            });
        }

        return false;
    }

    return false;
};
