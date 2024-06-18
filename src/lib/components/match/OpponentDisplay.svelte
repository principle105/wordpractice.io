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

<tr class="align-middle">
    <td class="min-h-9 min-w-9 py-1">
        <img
            src={matchUser.avatar}
            alt="{matchUser.username}'s Avatar"
            class="min-object-cover rounded-full"
        />
    </td>
    <td>
        <div
            class="pl-2 flex {matchUser.connected
                ? 'text-black'
                : 'text-red-500'}"
        >
            <div class="truncate max-w-44">{matchUser.username}</div>
            {#if showRating}
                <div>({matchUser.rating})</div>
            {/if}
        </div>
    </td>
    <td class="w-full px-6">
        <div
            class="w-full h-1.5 rounded-lg overflow-hidden {matchUser.connected
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
    </td>
    <td class="min-w-20 text-right">
        <span class="text-lg font-bold">{wpm}</span>
        <span class="text-gray-500 text-xs"> WPM</span>
    </td>
</tr>
