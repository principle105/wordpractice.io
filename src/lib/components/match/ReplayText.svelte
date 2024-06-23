<script lang="ts">
    import { onDestroy } from "svelte";
    import type { User } from "@prisma/client";

    import type { CasualMatchUser, Round, Replay, Replays } from "$lib/types";
    import {
        calculateWpm,
        calculateAccuracy,
        getTotalCorrectAndIncorrectChars,
    } from "$lib/utils/stats";
    import {
        convertReplayToWords,
        getCompletedAndIncorrectWords,
        getStartTime,
    } from "$lib/utils/textProcessing";

    import WordDisplay from "./WordDisplay.svelte";

    export let round: Round;
    export let user: User;
    export let matchUsers = new Map<string, CasualMatchUser>();

    let matchUserActionIndices = new Map<string, number>();
    let replays: Replays;

    let actualStartTime = 0;
    let timeElapsed = 0;
    let replaySpeed = 1;

    let animationFrameId: number | null = null;
    let resetWordDisplay = false;

    let wpm = 0;
    let accuracy = 0;

    $: round, (replays = getNewReplays());

    onDestroy(() => {
        if (animationFrameId === null) return;

        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    });

    const getNewReplays = () => {
        return Object.fromEntries(
            Object.keys(round.replays).map((userId) => [userId, []])
        );
    };

    const getUserActionIndex = (replay: Replay, actionIndex: number) => {
        if (replay.length === 0 || replay.length - 1 === actionIndex) {
            return null;
        }

        const action = replay[actionIndex];

        const startTime = getStartTime(replay, round.startTime);

        const replayTimeElapsedUntilAction = action.timestamp - startTime;

        // Checking if it is time to for the next action
        if (replayTimeElapsedUntilAction - timeElapsed * replaySpeed <= 0) {
            actionIndex++;
        }

        return actionIndex;
    };

    const play = () => {
        timeElapsed = Date.now() - actualStartTime;

        let replaysFinished = 0;

        for (const matchUserId in replays) {
            const fullReplay = round.replays[matchUserId];

            const matchUserActionIndex = getUserActionIndex(
                fullReplay,
                matchUserActionIndices.get(matchUserId) ?? 0
            );

            if (matchUserActionIndex === null) {
                replaysFinished++;
                continue;
            }

            matchUserActionIndices.set(matchUserId, matchUserActionIndex);

            const matchUserSlicedReplay = fullReplay.slice(
                0,
                matchUserActionIndex + 1
            );

            replays[matchUserId] = matchUserSlicedReplay;

            if (user.id !== matchUserId) continue;

            const startTime = getStartTime(fullReplay, round.startTime);

            const replayText = convertReplayToWords(
                matchUserSlicedReplay,
                round.quote.text
            ).join(" ");

            const { completedWords } = getCompletedAndIncorrectWords(
                replayText.split(" "),
                round.quote.text
            );

            if (matchUserActionIndex === fullReplay.length - 1) {
                wpm = calculateWpm(
                    fullReplay[fullReplay.length - 1].timestamp,
                    startTime,
                    completedWords.length
                );
            } else {
                wpm = calculateWpm(
                    timeElapsed + startTime,
                    startTime,
                    completedWords.length
                );
            }

            const { totalCorrectChars, totalIncorrectChars } =
                getTotalCorrectAndIncorrectChars(
                    matchUserSlicedReplay,
                    round.quote.text
                );

            accuracy = calculateAccuracy(
                totalCorrectChars,
                totalIncorrectChars
            );
        }

        // Stopping the animatoin if all the replays are finished
        if (replaysFinished === Object.keys(replays).length) {
            return;
        }

        animationFrameId = requestAnimationFrame(play);
    };

    const reset = () => {
        stop();

        timeElapsed = 0;
        matchUserActionIndices = new Map<string, number>();
        replays = getNewReplays();

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
    <div>{accuracy}% accuracy</div>
</div>

{#key resetWordDisplay}
    <WordDisplay
        round={{
            ...round,
            replays,
        }}
        {user}
        {timeElapsed}
        {matchUsers}
    />
{/key}
