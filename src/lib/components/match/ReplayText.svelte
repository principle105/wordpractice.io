<script lang="ts">
    import { onDestroy } from "svelte";

    import { START_TIME_LENIENCY } from "$lib/config";
    import type { Replay, BasicRoomInfoStarted } from "$lib/types";
    import { calculateWpm } from "$lib/utils/stats";
    import {
        convertReplayToWords,
        getCompletedAndIncorrectWords,
    } from "$lib/utils/textProcessing";

    import WordDisplay from "./WordDisplay.svelte";

    export let replay: Replay;
    export let fontSize: number;
    export let startedRoomInfo: BasicRoomInfoStarted;

    const getStartTime = () => {
        const maxStartTime = startedRoomInfo.startTime + START_TIME_LENIENCY;

        if (replay.length === 0) {
            return maxStartTime;
        }

        return Math.min(replay[0]?.timestamp, maxStartTime);
    };

    const startTime = getStartTime();

    let actualStartTime = 0;

    let timeElapsed = 0;
    let actionIndex = 0;

    let replaySpeed = 1;

    $: slicedReplay = replay.slice(0, actionIndex);

    let animationFrameId: number | null = null;
    let wpm = 0;
    let resetWordDisplay = false;

    const play = () => {
        if (replay.length === 0) {
            return;
        }

        const action = replay[actionIndex];

        timeElapsed = Date.now() - actualStartTime;

        const replayTimeElapsedUntilAction = action.timestamp - startTime;

        if (replayTimeElapsedUntilAction - timeElapsed * replaySpeed <= 0) {
            actionIndex++;

            // Checking if the replay is over
            if (actionIndex === replay.length) {
                return;
            }
        }

        animationFrameId = requestAnimationFrame(play);
    };

    onDestroy(() => {
        if (animationFrameId === null) return;

        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    });

    const reset = () => {
        stop();

        timeElapsed = 0;
        actionIndex = 0;

        resetWordDisplay = !resetWordDisplay;

        replaySpeed = 1;
    };

    const stop = () => {
        if (animationFrameId === null) return;

        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    };

    const increaseReplaySpeed = () => {
        if (replaySpeed > 0) {
            replaySpeed -= 0.25;
        }
    };

    const decreaseReplaySpeed = () => {
        if (replaySpeed < 1.75) {
            replaySpeed += 0.25;
        }
    };

    $: replayText = convertReplayToWords(
        replay.slice(0, actionIndex),
        startedRoomInfo.quote
    ).join(" ");

    $: ({ completedWords } = getCompletedAndIncorrectWords(
        replayText.split(" "),
        startedRoomInfo.quote
    ));
</script>

<button
    on:click={() => {
        if (animationFrameId !== null) return;

        actualStartTime = Date.now() - timeElapsed;
        play();
    }}
>
    Play
</button>

<button on:click={stop}>Stop</button>

<button on:click={reset}>Reset</button>

<button on:click={decreaseReplaySpeed}>-</button>
<button on:click={increaseReplaySpeed}>+</button>

<div class="flex gap-6">
    <div>{2 - replaySpeed}x speed</div>
    <div>{(timeElapsed / 1000).toFixed(1)}</div>
    <div>{wpm} wpm</div>
</div>

{#if startTime !== null}
    {#key resetWordDisplay}
        <WordDisplay
            {fontSize}
            {startedRoomInfo}
            replay={slicedReplay}
            timingOffset={Date.now() - (timeElapsed + startTime)}
            matchUsers={[]}
        />
    {/key}
{/if}
