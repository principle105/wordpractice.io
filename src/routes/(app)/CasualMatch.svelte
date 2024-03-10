<script lang="ts">
    // TODO: add max wrong characters and add server-side validation for it
    import type { User } from "lucia";
    import type { Socket } from "socket.io-client";

    import type { MatchUser, Replay, RoomInfo } from "$lib/types";
    import { convertReplayToText, getCorrect } from "$lib/utils";
    import { defaultMatch } from "$lib/constants";
    import { match } from "$lib/stores/match";
    import { BASE_FONT_SIZE } from "$lib/config";

    import OpponentDisplay from "./OpponentDisplay.svelte";
    import ReplayText from "./ReplayText.svelte";
    import WordDisplay from "./WordDisplay.svelte";
    import TestInput from "./TestInput.svelte";
    import MatchContainer from "./MatchContainer.svelte";
    import EndScreen from "./EndScreen.svelte";

    export let user: User;
    export let roomInfo: RoomInfo;
    export let matchUsers = new Map<string, MatchUser>();
    export let replay: Replay = [];
    export let started: boolean;
    export let socket: Socket;
    export let finished: boolean;

    let showReplay = false;

    let wpm = 0;

    const fontSize: number = user.fontScale * BASE_FONT_SIZE;

    $: replayText = convertReplayToText(replay);
    $: ({ correct: correctInput, incorrectChars } = getCorrect(
        replayText,
        roomInfo.quote
    ));

    const playAgain = () => {
        match.set(null);
        socket.disconnect();

        setTimeout(() => {
            match.update((m) => {
                if (m === null) {
                    return { ...defaultMatch, type: "casual" };
                }

                m.type = "casual";
                return m;
            });
        });
    };
</script>

<svelte:head>
    <title>Casual Match - WordPractice</title>
</svelte:head>

<MatchContainer {finished}>
    <div slot="racers" class="flex flex-col gap-3">
        <OpponentDisplay
            username={user.name}
            avatar={user.avatar}
            {replay}
            connected={true}
            {roomInfo}
            bind:wpm
            bind:finished
        />
        {#each matchUsers as [_, matchUser]}
            <OpponentDisplay
                username={matchUser.name}
                replay={matchUser.replay}
                connected={matchUser.connected}
                avatar={matchUser.avatar}
                {roomInfo}
            />
        {/each}
    </div>

    <div slot="end-screen">
        <div class="mt-16 flex flex-col justify-center">
            <h2 class="text-3xl">Your Stats</h2>
            <EndScreen {replay} {roomInfo} />
        </div>

        <button
            class="bg-zinc-500 p-3 rounded-md text-white"
            on:click={() => (showReplay = true)}
        >
            Replay
        </button>
        <button
            class="bg-emerald-500 p-3 rounded-md text-white"
            on:click={playAgain}
        >
            Play Again
        </button>
        {#if showReplay}
            <ReplayText {fontSize} {replay} {roomInfo} />
        {/if}
    </div>

    <svelte:fragment slot="word-display">
        <WordDisplay
            {correctInput}
            {incorrectChars}
            {fontSize}
            matchUsers={Array.from(matchUsers.values())}
            {replay}
            {roomInfo}
        />
    </svelte:fragment>

    <svelte:fragment slot="input">
        <TestInput bind:replayText bind:replay {started} {roomInfo} />
    </svelte:fragment>
</MatchContainer>
