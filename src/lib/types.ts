import type { User } from "@prisma/client";
import type { Socket } from "socket.io";

export type Provider = "github" | "google" | "discord";
export type MatchType = "ranked" | "casual" | "private";

export interface Match {
    type: MatchType;
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

export type UserProfile = Pick<User, "id" | "username" | "rating" | "avatar">;

export interface MatchUser extends UserProfile {
    replay: Replay;
    connected: boolean;
}

export interface RoomInfo {
    matchType: MatchType;
    roomId: string;
    startTime: number | null;
    quote: string[];
}

export interface Room extends RoomInfo {
    users: { [key: string]: MatchUser }; // not using a Map because cannot be serialized by socket.io
}

export interface RoomWithSocketInfo extends Room {
    sockets: Map<string, Socket>;
}

export interface NewActionPayload {
    userId: string;
    actions: Replay;
}
