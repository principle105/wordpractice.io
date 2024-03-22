<script lang="ts">
    import { onMount } from "svelte";

    import { START_TIME_LENIENCY } from "$lib/config";
    import type { MatchUser, RoomInfo } from "$lib/types";
    import {
        convertReplayToText,
        getCompletedAndIncorrectWords,
    } from "$lib/utils/textProcessing";
    import { calculateWpm } from "$lib/utils/stats";

    export let roomInfo: RoomInfo;
    export let matchUser: MatchUser;
    export let wpm = 0;
    export let finished = false;
    export let showRating = false;

    onMount(() => {
        const interval = setInterval(() => {
            if (roomInfo.startTime === null) return;

            const startTime = Math.min(
                matchUser.replay[0]?.timestamp,
                roomInfo.startTime + START_TIME_LENIENCY
            );

            const quoteLength = roomInfo.quote.join(" ").length;

            if (
                finished ||
                completedWords.length === quoteLength ||
                !matchUser.connected
            ) {
                clearInterval(interval);
                finished = true;
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

    $: wordsTyped = convertReplayToText(matchUser.replay);
    $: ({ completedWords } = getCompletedAndIncorrectWords(
        wordsTyped,
        roomInfo.quote
    ));
</script>

<div
    class="flex items-center justify-between gap-3"
    style="order: {-completedWords.length - (finished ? wpm : 0)}"
>
    <div class="flex gap-5 items-center">
        <div class="flex items-center gap-3">
            <img
                src={matchUser.avatar}
                alt="{matchUser.name}'s Avatar"
                class="h-12 w-12 object-cover rounded-full"
            />
            <div class={matchUser.connected ? "text-black" : "text-red-500"}>
                {matchUser.name}{showRating ? `(${matchUser.rating})` : ""}
            </div>
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
                roomInfo.quote.join(' ').length) *
                100}%"
        />
    </div>
    <div class="w-32 text-right">
        <span class="text-xl font-bold">{wpm}</span>
        <span class="text-gray-500"> WPM</span>
    </div>
</div>
