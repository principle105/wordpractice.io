import type { User } from "@prisma/client";
import type { Socket } from "socket.io";

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

export type UserProfile = Pick<User, "id" | "name" | "rating" | "avatar">;

export interface MatchUser extends UserProfile {
    replay: Replay;
    connected: boolean;
}

export interface Room {
    matchType: MatchType;
    roomId: string;
    startTime: number | null;
    quote: string[];
    users: { [key: string]: MatchUser }; // not using a Map because cannot be serialized by socket.io
}

export interface NewActionPayload {
    userId: string;
    actions: Replay;
}

export interface RoomWithSocketInfo extends Room {
    sockets: Map<string, Socket>;
}

export type RoomInfo = Omit<Room, "users">;

export type Provider = "github" | "google" | "discord";
