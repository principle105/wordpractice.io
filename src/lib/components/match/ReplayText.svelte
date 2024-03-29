<script lang="ts">
    import { onDestroy } from "svelte";

    import { START_TIME_LENIENCY } from "$lib/config";
    import type { Replay, RoomInfo } from "$lib/types";
    import { calculateWpm } from "$lib/utils/stats";
    import { getCompletedAndIncorrectWords } from "$lib/utils/textProcessing";

    import WordDisplay from "./WordDisplay.svelte";

    export let replay: Replay;
    export let fontSize: number;
    export let roomInfo: RoomInfo;

    const getStartTime = () => {
        if (roomInfo.startTime === null) {
            return null;
        }

        const maxStartTime = roomInfo.startTime + START_TIME_LENIENCY;

        if (replay.length === 0) {
            return maxStartTime;
        }

        return Math.min(replay[0]?.timestamp, maxStartTime);
    };

    const startTime: number | null = getStartTime();
    let actualStartTime = 0;

    let timeElapsed = 0;
    let actionIndex = 0;
    let replayText = "";

    let replaySpeed = 1;

    $: ({ completedWords } = getCompletedAndIncorrectWords(
        replayText.split(" "),
        roomInfo.quote
    ));

    $: slicedReplay = replay.slice(
        0,
        actionIndex - (actionIndex === replay.length ? 0 : 1)
    );

    let animationFrameId: number;
    let wpm = NaN;
    let resetWordDisplay = false;

    const play = () => {
        if (replay.length === 0) {
            return;
        }

        if (startTime === null) {
            return;
        }

        const action = replay[actionIndex];

        timeElapsed = Date.now() - actualStartTime;

        wpm = calculateWpm(Date.now(), actualStartTime, completedWords.length);

        const replayTimeElapsedUntilAction = action.timestamp - startTime;

        if (replayTimeElapsedUntilAction - timeElapsed <= 0) {
            if (action.type === "character") {
                replayText += action.letter;
            } else if (action.type === "delete") {
                replayText =
                    replayText.slice(0, action.slice[0]) +
                    replayText.slice(action.slice[1]);
            }

            actionIndex++;

            // Checking if the replay is over
            if (actionIndex === replay.length) {
                wpm = calculateWpm(
                    replay[replay.length - 1].timestamp,
                    startTime,
                    completedWords.length + 1 // TODO: Quick fix for the last character not being counted
                );
                return;
            }
        }

        animationFrameId = requestAnimationFrame(play);
    };

    onDestroy(() => {
        cancelAnimationFrame(animationFrameId);
    });

    const resetLastReplay = () => {
        replayText = "";
        timeElapsed = 0;
        actionIndex = 0;

        resetWordDisplay = !resetWordDisplay;
    };

    const reset = () => {
        resetLastReplay();
        replaySpeed = 1;
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
</script>

<button
    on:click={() => {
        resetLastReplay();
        actualStartTime = Date.now();
        play();
    }}
>
    Play
</button>

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
            {roomInfo}
            replay={slicedReplay}
            timingOffset={Date.now() - (timeElapsed + startTime)}
            matchUsers={[]}
        />
    {/key}
{/if}
