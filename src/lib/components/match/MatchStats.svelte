<script lang="ts">
    import { START_TIME_LENIENCY } from "$lib/config";
    import type { Replay, BasicRoomInfoStarted } from "$lib/types";

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
    export let startedRoomInfo: BasicRoomInfoStarted;

    const getWpm = (): number => {
        if (replay.length === 0) return 0;

        const startTime = Math.min(
            replay[0]?.timestamp,
            startedRoomInfo.startTime + START_TIME_LENIENCY
        );

        const wordsTyped = convertReplayToWords(replay, startedRoomInfo.quote);
        const { completedWords } = getCompletedAndIncorrectWords(
            wordsTyped,
            startedRoomInfo.quote
        );

        return calculateWpm(
            replay[replay.length - 1]?.timestamp,
            startTime,
            completedWords.length
        );
    };

    const getAccuracy = (): number => {
        const { totalCorrectChars, totalIncorrectChars } =
            getTotalCorrectAndIncorrectChars(replay, startedRoomInfo.quote);

        return calculateAccuracy(totalCorrectChars, totalIncorrectChars);
    };
</script>

<section class="flex flex-col">
    <div>
        <div>WPM</div>
        <div>{getWpm()}</div>
    </div>
    <div>
        <div>Accuracy</div>
        <div>{getAccuracy()}%</div>
    </div>
</section>
