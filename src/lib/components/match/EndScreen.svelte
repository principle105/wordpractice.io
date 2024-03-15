<script lang="ts">
    import { START_TIME_LENIENCY } from "$lib/config";
    import type { Replay, RoomInfo } from "$lib/types";
    import {
        calculateWpm,
        convertReplayToText,
        getCorrect,
        getTotalCorrect,
    } from "$lib/utils";

    export let replay: Replay;
    export let roomInfo: RoomInfo;

    // TODO: fix typing on roomInfo.startTime
    const startTime = Math.min(
        replay[0]?.timestamp,
        roomInfo.startTime + START_TIME_LENIENCY
    );

    const userReplay = convertReplayToText(replay);
    const { correct: correctInput } = getCorrect(userReplay, roomInfo.quote);

    const { totalCorrectChars, totalIncorrectChars } = getTotalCorrect(
        replay,
        roomInfo.quote.join(" ")
    );

    const getWpm = () => {
        if (roomInfo.startTime === null) return;

        return calculateWpm(
            replay[replay.length - 1]?.timestamp,
            startTime,
            correctInput.length
        );
    };

    const getAccuracy = () => {
        if (totalCorrectChars + totalIncorrectChars === 0) return 0;

        return (
            (totalCorrectChars / (totalCorrectChars + totalIncorrectChars)) *
            100
        );
    };
</script>

<div>{getWpm()}</div>
<div>{totalCorrectChars} {totalIncorrectChars}</div>
<div>{getAccuracy()}</div>
