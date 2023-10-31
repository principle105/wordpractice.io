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

export interface CaretMovement {
    type: "caret";
    start: number;
    end: number;
    timestamp: number;
}

export interface Delete {
    type: "delete";
    slice: [number, number];
    timestamp: number;
}

export type Replay = (Character | Delete | CaretMovement)[];

export interface MatchUser extends Pick<User, "id" | "name" | "rating"> {
    replay: Replay;
}

export interface Room {
    roomId: string;
    startTime: number;
    quote: string[];
    users: { [key: string]: MatchUser }; // not using a Map because cannot be serialized by socket.io
}

export type RoomInfo = Omit<Room, "users">;

export const defaultMatch: Match = {
    type: "casual",
    users: [],
};
