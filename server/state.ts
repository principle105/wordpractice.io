import type {
    CasualRoomWithSocketInfo,
    RankedRoomWithSocketInfo,
} from "../src/lib/types";

export const rankedRooms = new Map<string, RankedRoomWithSocketInfo>();
export const casualRooms = new Map<string, CasualRoomWithSocketInfo>();
