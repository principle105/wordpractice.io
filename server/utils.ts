import type { Replay } from "../src/lib/types";

import { convertReplayToText, calculateWpm } from "../src/lib/utils";
import { START_TIME_LENIENCY } from "../src/lib/config";

export const getWpmFromReplay = (
    replay: Replay,
    roomStartTime: number,
    quote: string[]
) => {
    const startTime = Math.min(
        replay[0]?.timestamp,
        roomStartTime + START_TIME_LENIENCY
    );

    // Checking if the user didn't finish
    if (convertReplayToText(replay).join(" ") !== quote.join(" ")) {
        return 0;
    }

    const wpm = calculateWpm(
        replay[replay.length - 1]?.timestamp,
        startTime,
        quote.join(" ").length
    );

    return wpm;
};
