<script lang="ts">
    import type { BasicRoomInfoStarted, Round, Replay } from "$lib/types";

    import {
        convertReplayToWords,
        getCompletedAndIncorrectWords,
        getStartTime,
    } from "$lib/utils/textProcessing";
    import {
        calculateWpm,
        calculateAccuracy,
        getTotalCorrectAndIncorrectChars,
    } from "$lib/utils/stats";
    import type { User } from "@prisma/client";

    export let round: Round;
    export let user: User;
    export let startedRoomInfo: BasicRoomInfoStarted;

    $: userReplay = round.replays[user.id];

    const getWpm = (replay: Replay): number => {
        if (replay.length === 0) return 0;

        const startTime = getStartTime(replay, startedRoomInfo.startTime);

        const wordsTyped = convertReplayToWords(replay, round.quote.text);
        const { completedWords } = getCompletedAndIncorrectWords(
            wordsTyped,
            round.quote.text
        );

        return calculateWpm(
            replay[replay.length - 1]?.timestamp,
            startTime,
            completedWords.length
        );
    };

    const getAccuracy = (replay: Replay): number => {
        const { totalCorrectChars, totalIncorrectChars } =
            getTotalCorrectAndIncorrectChars(replay, round.quote.text);

        return calculateAccuracy(totalCorrectChars, totalIncorrectChars);
    };
</script>

<section class="flex flex-col">
    <div>
        <div>WPM</div>
        <div>{getWpm(userReplay)}</div>
    </div>
    <div>
        <div>Accuracy</div>
        <div>{getAccuracy(userReplay)}%</div>
    </div>
</section>
