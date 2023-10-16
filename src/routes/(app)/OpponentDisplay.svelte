<script lang="ts">
    import type { MatchUser, RoomInfo } from "$lib/types";
    import { calculateWpm, convertReplayToText, getCorrect } from "$lib/utils";
    import { onMount } from "svelte";

    export let matchUser: MatchUser;
    export let roomInfo: RoomInfo;

    let wpm = 0;

    onMount(() => {
        const interval = setInterval(() => {
            if (correct.length === roomInfo.quote.join(" ").length) {
                clearInterval(interval);
                wpm = calculateWpm(
                    matchUser.replay[matchUser.replay.length - 1]?.timestamp,
                    Math.min(
                        matchUser.replay[0]?.timestamp,
                        roomInfo.startTime + 2
                    ), // TODO: add a constant for the leniency on start time and align users based on start time instead of live
                    correct.length
                );
            } else {
                wpm = calculateWpm(
                    Date.now(),
                    Math.min(
                        matchUser.replay[0]?.timestamp,
                        roomInfo.startTime + 2
                    ),
                    correct.length
                );
            }
        }, 250);
        return () => clearInterval(interval);
    });

    $: userReplay = convertReplayToText(matchUser.replay).split(" ");
    $: ({ correct } = getCorrect(userReplay, roomInfo.quote));
</script>

<div class="flex gap-5">
    <div>{matchUser.data.email}</div>
    <div class="text-center">
        <span class="text-xl font-bold">{wpm}</span>
        <span class="text-gray-500"> WPM</span>
    </div>
</div>
