<script lang="ts">
    import { START_TIME_LENIENCY } from "$lib/config";
    import type { MatchUser, RoomInfo } from "$lib/types";
    import { calculateWpm, convertReplayToText, getCorrect } from "$lib/utils";
    import { onMount } from "svelte";

    export let user: MatchUser;
    export let roomInfo: RoomInfo;

    export let wpm: number = 0;
    export let finished: boolean = false;

    onMount(() => {
        const interval = setInterval(() => {
            const startTime = Math.min(
                user.replay[0]?.timestamp,
                roomInfo.startTime + START_TIME_LENIENCY
            );

            if (correctInput.length === roomInfo.quote.join(" ").length) {
                clearInterval(interval);
                finished = true;
                wpm = calculateWpm(
                    user.replay[user.replay.length - 1]?.timestamp,
                    startTime,
                    correctInput.length
                );
            } else {
                wpm = calculateWpm(Date.now(), startTime, correctInput.length);
            }
        }, 250);
        return () => clearInterval(interval);
    });

    $: userReplay = convertReplayToText(user.replay);
    $: ({ correct: correctInput } = getCorrect(userReplay, roomInfo.quote));
</script>

<div
    class="flex items-center justify-between"
    style="order: {-correctInput.length - (finished ? wpm : 0)}"
>
    <div class="flex gap-5 items-center">
        <div class={user.connected ? "text-black" : "text-red-500"}>
            {user.name} ({user.rating})
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
