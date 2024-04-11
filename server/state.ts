import type {
    CasualRoomWithSocketInfo,
    RankedRoomWithSocketInfo,
    WaitingUser,
} from "../src/lib/types";

export const rankedQueue = new Map<string, WaitingUser>();

export const rankedRooms = new Map<string, RankedRoomWithSocketInfo>();
export const casualRooms = new Map<string, CasualRoomWithSocketInfo>();
