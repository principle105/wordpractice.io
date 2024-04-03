<script lang="ts">
    import { START_TIME_LENIENCY } from "$lib/config";
    import type { Replay, BasicRoomInfo } from "$lib/types";

    import {
        convertReplayToWords,
        getCompletedAndIncorrectWords,
    } from "$lib/utils/textProcessing";
    import {
        calculateWpm,
        calculateAccuracy,
        getTotalCorrectAndIncorrectChars,
    } from "$lib/utils/stats";

    export let replay: Replay;
    export let roomInfo: BasicRoomInfo;

    const getWpm = (): number => {
        if (roomInfo.startTime === null || roomInfo.quote === null) return 0;

        const startTime = Math.min(
            replay[0]?.timestamp,
            roomInfo.startTime + START_TIME_LENIENCY
        );

        const wordsTyped = convertReplayToWords(replay, roomInfo.quote);
        const { completedWords } = getCompletedAndIncorrectWords(
            wordsTyped,
            roomInfo.quote
        );

        return calculateWpm(
            replay[replay.length - 1]?.timestamp,
            startTime,
            completedWords.length
        );
    };

    const getAccuracy = (): number => {
        if (roomInfo.quote === null) return 0;

        const { totalCorrectChars, totalIncorrectChars } =
            getTotalCorrectAndIncorrectChars(replay, roomInfo.quote);

        return calculateAccuracy(totalCorrectChars, totalIncorrectChars);
    };
</script>

<section class="flex flex-col">
    <div>
        <div>Words Per Minute</div>
        <div>{getWpm()}</div>
    </div>
    <div>
        <div>Accuracy</div>
        <div>{getAccuracy()}%</div>
    </div>
</section>
