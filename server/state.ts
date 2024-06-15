import type { CasualRoom, RankedRoom, WaitingUser } from "../src/lib/types";

export const rankedQueue = new Map<string, WaitingUser>();

export const rankedRooms = new Map<string, RankedRoom>();
export const casualRooms = new Map<string, CasualRoom>();
