<script lang="ts">
    import { onMount } from "svelte";

    import { START_TIME_LENIENCY } from "$lib/config";
    import type { CasualMatchUser, BasicRoomInfoStarted } from "$lib/types";
    import {
        convertReplayToWords,
        getCompletedAndIncorrectWords,
    } from "$lib/utils/textProcessing";
    import { calculateWpm } from "$lib/utils/stats";

    export let startedRoomInfo: BasicRoomInfoStarted;
    export let matchUser: CasualMatchUser;
    export let finished = false;
    export let showRating = false;

    let wpm = 0;

    $: wordsTyped = convertReplayToWords(
        matchUser.replay,
        startedRoomInfo.quote
    );
    $: ({ completedWords } = getCompletedAndIncorrectWords(
        wordsTyped,
        startedRoomInfo.quote
    ));

    $: finished =
        completedWords.length === startedRoomInfo.quote.join(" ").length ||
        !matchUser.connected;

    onMount(() => {
        const interval = setInterval(() => {
            const startTime = Math.min(
                matchUser.replay[0]?.timestamp,
                startedRoomInfo.startTime + START_TIME_LENIENCY
            );

            if (finished) {
                clearInterval(interval);

                wpm = calculateWpm(
                    matchUser.replay[matchUser.replay.length - 1]?.timestamp,
                    startTime,
                    completedWords.length
                );
            } else {
                wpm = calculateWpm(
                    Date.now(),
                    startTime,
                    completedWords.length
                );
            }
        }, 250);

        return () => clearInterval(interval);
    });
</script>

<div
    class="flex items-center justify-between gap-3"
    style="order: {-completedWords.length - (finished ? wpm : 0)}"
>
    <div class="flex items-center gap-3 w-52">
        <img
            src={matchUser.avatar}
            alt="{matchUser.username}'s Avatar"
            class="h-12 w-12 object-cover rounded-full"
        />
        <div class={matchUser.connected ? "text-black" : "text-red-500"}>
            {matchUser.username}{showRating ? `(${matchUser.rating})` : ""}
        </div>
    </div>
    <div
        class="flex-grow h-2 rounded-lg overflow-hidden {matchUser.connected
            ? 'bg-gray-200'
            : 'bg-red-100'}"
    >
        <div
            class="h-full transition-all duration-200 rounded-r-lg {matchUser.connected
                ? 'bg-green-500'
                : 'bg-red-300'}"
            style="width: {(completedWords.length /
                startedRoomInfo.quote.join(' ').length) *
                100}%; transition-timing-function: cubic-bezier(.02, .01, .47, 1);"
        />
    </div>
    <div class="w-28 text-right">
        <span class="text-xl font-bold">{wpm}</span>
        <span class="text-gray-500"> WPM</span>
    </div>
</div>
