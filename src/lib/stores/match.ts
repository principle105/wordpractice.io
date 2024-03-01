import type { Match } from "$lib/types";
import { writable } from "svelte/store";

export const match = writable<Match | null>(null);
