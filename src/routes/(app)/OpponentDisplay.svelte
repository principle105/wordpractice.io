<script lang="ts">
    import type { Replay, RoomInfo } from "$lib/types";
    import { calculateWpm, convertReplayToText, getCorrect } from "$lib/utils";
    import { onMount } from "svelte";

    export let name: string;
    export let replay: Replay;
    export let roomInfo: RoomInfo;

    export let wpm: number = 0;
    export let finished: boolean = false;

    onMount(() => {
        const interval = setInterval(() => {
            // TODO: add a constant for the leniency on start time and align users based on start time instead of live
            const startTime = Math.min(
                replay[0]?.timestamp,
                roomInfo.startTime + 2 * 1000
            );

            if (correct.length === roomInfo.quote.join(" ").length) {
                clearInterval(interval);
                finished = true;
                wpm = calculateWpm(
                    replay[replay.length - 1]?.timestamp,
                    startTime,
                    correct.length
                );
            } else {
                wpm = calculateWpm(Date.now(), startTime, correct.length);
            }
        }, 250);
        return () => clearInterval(interval);
    });

    $: userReplay = convertReplayToText(replay).split(" ");
    $: ({ correct } = getCorrect(userReplay, roomInfo.quote));
</script>

<div class="flex items-center justify-between" style="order: {-wpm}">
    <div class="flex gap-5 items-center">
        <div>{name}</div>
        <div class="text-center">
            <span class="text-xl font-bold">{wpm}</span>
            <span class="text-gray-500"> WPM</span>
        </div>
    </div>
    {#if finished}
        <div>Finished</div>
    {/if}
</div>
