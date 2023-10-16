import type { User } from "lucia";

export interface Match {
    type: "ranked" | "casual" | "private";
    users: string[];
}

export interface Character {
    type: "character";
    letter: string;
    timestamp: number;
}

export interface Delete {
    type: "delete";
    amount: number;
    timestamp: number;
}

export type Replay = (Character | Delete)[];

export interface MatchUser {
    data: User;
    replay: Replay;
}

export interface ExistingRoom {
    startTime: number;
    quote: string[];
    users: MatchUser[];
}

export type RoomInfo = Omit<ExistingRoom, "users">;

export const defaultMatch: Match = {
    type: "casual",
    users: [],
};
