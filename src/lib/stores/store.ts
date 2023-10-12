import type { Match } from "$lib/types";
import { useWritable } from "./use-shared-store";

export const useMatchMode = () => useWritable<Match | null>("match", null);
