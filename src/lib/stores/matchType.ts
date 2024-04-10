import type { MatchType } from "$lib/types";
import { writable } from "svelte/store";

export const matchType = writable<MatchType | null>(null);
