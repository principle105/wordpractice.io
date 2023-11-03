<script lang="ts">
    import { START_TIME_LENIENCY } from "$lib/config";
    import type { Replay, RoomInfo } from "$lib/types";
    import { getCorrect } from "$lib/utils";
    import WordDisplay from "./WordDisplay.svelte";

    export let replay: Replay;
    export let fontSize: number;
    export let roomInfo: RoomInfo;

    const startTime = Math.min(
        replay[0].timestamp,
        roomInfo.startTime + START_TIME_LENIENCY
    );

    let timeElapsed: number = 0;
    let currentWordIndex: number = 0;
    let replayText: string = "";

    let replaySpeed: number = 1;

    $: ({ correct: correctInput, incorrectChars } = getCorrect(
        replayText.split(" "),
        roomInfo.quote
    ));

    let actionTimeout: NodeJS.Timeout;

    const play = () => {
        const action = replay[currentWordIndex];

        const actionTimeSinceStart = action.timestamp - startTime;

        actionTimeout = setTimeout(() => {
            currentWordIndex += 1;
            timeElapsed = actionTimeSinceStart;

            if (action.type === "character") {
                replayText += action.letter;
            } else if (action.type === "delete") {
                replayText =
                    replayText.slice(0, action.slice[0]) +
                    replayText.slice(action.slice[1]);
            }

            // Checking if the replay is over
            if (currentWordIndex === replay.length) {
                return;
            }

            play();
        }, (actionTimeSinceStart - timeElapsed) * replaySpeed);
    };

    const reset = () => {
        clearTimeout(actionTimeout);
        replayText = "";
        timeElapsed = 0;
        currentWordIndex = 0;
        replaySpeed = 1;

        resetWordDisplay = !resetWordDisplay;
    };

    const increaseReplaySpeed = () => {
        if (replaySpeed > 0.25) {
            replaySpeed -= 0.25;
        }
    };

    const decreaseReplaySpeed = () => {
        if (replaySpeed < 2) {
            replaySpeed += 0.25;
        }
    };

    let resetWordDisplay = false;
</script>

<button on:click={play}>Play</button>
<button on:click={reset}>Reset</button>

<button on:click={() => decreaseReplaySpeed()}>-</button>
<button on:click={() => increaseReplaySpeed()}>+</button>

<div>{2 - replaySpeed}</div>
{#key resetWordDisplay}
    <WordDisplay
        {correctInput}
        {incorrectChars}
        {fontSize}
        {roomInfo}
        replay={replay.slice(
            0,
            currentWordIndex - (currentWordIndex === replay.length ? 0 : 1)
        )}
        timingOffset={Date.now() - (timeElapsed + startTime)}
        matchUsers={[]}
    />
{/key}
