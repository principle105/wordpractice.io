import type { User } from "@prisma/client";
import type { Socket } from "socket.io";

export type Provider = "google" | "github" | "discord";
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

export interface BasicRoomInfo {
    id: string;
    matchType: MatchType;
    startTime: number | null;
    quote: string[] | null;
}

export interface BasicRoomInfoStarted extends BasicRoomInfo {
    startTime: number;
    quote: string[];
}

interface SavedRoom extends BasicRoomInfo {
    users: { [key: string]: MatchUser }; // not using a Map because cannot be serialized by socket.io
}

export interface RankedRoom extends SavedRoom {
    matchType: "ranked";
    scores: { [key: string]: number };
    userBlacklistedTextTypes: { [key: string]: string[] };
}

export interface CasualRoom extends SavedRoom {
    matchType: "casual";
}

export interface RankedRoomWithSocketInfo extends RankedRoom {
    sockets: Map<string, Socket>;
}

export interface CasualRoomWithSocketInfo extends CasualRoom {
    sockets: Map<string, Socket>;
}

export interface NewActionPayload {
    userId: string;
    actions: Replay;
}
