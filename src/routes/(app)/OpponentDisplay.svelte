<script lang="ts">
    import { START_TIME_LENIENCY } from "$lib/config";
    import type { Replay, RoomInfo } from "$lib/types";
    import { calculateWpm, convertReplayToText, getCorrect } from "$lib/utils";
    import { onMount } from "svelte";

    export let username: string;
    export let avatar: string;
    export let replay: Replay;
    export let connected: boolean;
    export let rating: number | null = null;
    export let roomInfo: RoomInfo;

    export let wpm = 0;
    export let finished = false;

    onMount(() => {
        const interval = setInterval(() => {
            if (roomInfo.startTime === null) return;

            const startTime = Math.min(
                replay[0]?.timestamp,
                roomInfo.startTime + START_TIME_LENIENCY
            );

            if (
                finished ||
                correctInput.length === roomInfo.quote.join(" ").length ||
                !connected
            ) {
                clearInterval(interval);
                finished = true;
                wpm = calculateWpm(
                    replay[replay.length - 1]?.timestamp,
                    startTime,
                    correctInput.length
                );
            } else {
                wpm = calculateWpm(Date.now(), startTime, correctInput.length);
            }
        }, 250);
        return () => clearInterval(interval);
    });

    $: userReplay = convertReplayToText(replay);
    $: ({ correct: correctInput } = getCorrect(userReplay, roomInfo.quote));
</script>

<div
    class="flex items-center justify-between"
    style="order: {-correctInput.length - (finished ? wpm : 0)}"
>
    <div class="flex gap-5 items-center">
        <div class="flex items-center gap-3">
            <img
                src={avatar}
                alt="{username}'s Avatar"
                class="h-12 w-12 object-cover rounded-full"
            />
            <div class={connected ? "text-black" : "text-red-500"}>
                {username}{rating ? `(${rating})` : ""}
            </div>
        </div>
        <div class="text-center">
            <span class="text-xl font-bold">{wpm}</span>
            <span class="text-gray-500"> WPM</span>
        </div>
    </div>
    {#if finished}
        <div>Finished</div>
    {/if}
</div>
