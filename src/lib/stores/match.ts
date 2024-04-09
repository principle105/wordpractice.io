import type { BasicRoomInfo } from "$lib/types";
import { writable } from "svelte/store";

export const match = writable<BasicRoomInfo | null>(null);
