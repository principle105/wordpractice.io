import type { User } from "@prisma/client";
import type { Socket } from "socket.io";

// Auth

export type Provider = "google" | "github" | "discord";
export type MatchType = "ranked" | "casual" | "private";

// Replay

export interface BaseAction {
    type: string;
    timestamp: number;
}

export interface Character extends BaseAction {
    type: "character";
    letter: string;
}

export interface CaretMovement extends BaseAction {
    type: "caret";
    start: number;
    end: number;
}

export interface Delete extends BaseAction {
    type: "delete";
    slice: [number, number];
}

export interface Disconnect extends BaseAction {
    type: "disconnect";
}

export type Action = Character | Delete | CaretMovement | Disconnect;

export type Replay = Action[];

// Match

export interface Match {
    type: MatchType;
    users: string[];
}

export type UserProfile = Pick<User, "id" | "username" | "rating" | "avatar">;

export interface WaitingUser {
    user: UserProfile;
    socket: Socket;
}

export interface CasualMatchUser extends UserProfile {
    replay: Replay;
    connected: boolean;
}

export interface RankedMatchUser extends CasualMatchUser {
    score: number;
}

export interface BasicRoomInfo {
    id: string;
    matchType: MatchType;
    quote: Quote | null;
    startTime: number | null;
}

export interface BasicRoomInfoStarted extends BasicRoomInfo {
    startTime: number;
    quote: Quote;
}

export type Replays = { [key: string]: Replay };

export interface Round {
    quote: Quote;
    replays: Replays;
    startTime: number;
}

export interface RankedRoom extends BasicRoomInfo {
    matchType: "ranked";
    users: { [key: string]: RankedMatchUser };
    blacklistedTextCategories: TextCategory[];
    firstUserToBlacklist: string | null;
    blacklistDecisionEndTime: number | null;
    quoteSelectionDecisionEndTime: number | null;
    prevRounds: Round[];
    sockets: Map<string, Socket>;
}

export interface CasualRoom extends BasicRoomInfo {
    matchType: "casual";
    users: { [key: string]: CasualMatchUser };
    sockets: Map<string, Socket>;
}

// General socket event payloads

export interface NewActionPayload {
    userId: string;
    actions: Replay;
}

export interface UpdateReplayPayload {
    userId: string;
    replay: Replay;
}

// Casual socket event payloads
export type CasualRoomPayload = Omit<CasualRoom, "sockets">;

// Ranked socket event payloads
export type RankedRoomPayload = Omit<RankedRoom, "sockets">;

// Texts

export type QuoteCategory = "quote easy" | "quote hard";
export type DictionaryCategory = "dictionary easy" | "dictionary hard";

export type TextCategory = QuoteCategory | DictionaryCategory;

export interface Quote {
    category: TextCategory;
    text: string[];
    source: string;
}
