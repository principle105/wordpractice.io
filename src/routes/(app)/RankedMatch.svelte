<script lang="ts">
    // TODO: add max wrong characters and add server-side validation for it
    import type { User } from "lucia";
    import type { Socket } from "socket.io-client";

    import type { MatchUser, Replay, RoomInfo } from "$lib/types";
    import { convertReplayToText, getCorrect } from "$lib/utils";
    import { useMatchMode } from "$lib/stores/store";
    import { BASE_FONT_SIZE } from "$lib/config";

    import OpponentDisplay from "./OpponentDisplay.svelte";
    import ReplayText from "./ReplayText.svelte";
    import WordDisplay from "./WordDisplay.svelte";
    import TestInput from "./TestInput.svelte";

    const match = useMatchMode();

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

    socket.on("update-rating", (ratings: { id: string; rating: number }[]) => {
        ratings.forEach((u) => {
            if (u.id === user.id) {
                user.rating = u.rating;
            } else {
                let user = matchUsers.get(u.id);

                if (user) {
                    matchUsers.set(u.id, {
                        ...user,
                        rating: u.rating,
                    });
                }
            }
        });

        matchUsers = matchUsers;
    });

    let connected = false;

    setInterval(() => {
        connected = socket.connected;
    }, 100);
</script>

<div class="fixed bottom-0 font-mono">
    {connected ? "Connected" : "Disconnected"}
</div>

<svelte:head>
    <title>Ranked Match - WordPractice</title>
</svelte:head>

<div class="flex flex-col">
    <OpponentDisplay
        username={user.name}
        avatar={user.avatar}
        {replay}
        connected={true}
        rating={user.rating}
        {roomInfo}
        bind:wpm
        bind:finished
    />
    {#each matchUsers as [_, matchUser]}
        <OpponentDisplay
            username={matchUser.name}
            replay={matchUser.replay}
            connected={matchUser.connected}
            rating={matchUser.rating}
            avatar={matchUser.avatar}
            {roomInfo}
        />
    {/each}
</div>

{#if finished}
    <div class="mt-16 flex flex-col justify-center">
        <h2 class="text-3xl">Your Stats</h2>
        <div>
            <div>{wpm} wpm</div>
        </div>
    </div>
    <button
        class="bg-zinc-500 p-3 rounded-md text-white"
        on:click={() => (showReplay = true)}
    >
        Replay
    </button>
    <button
        class="bg-emerald-500 p-3 rounded-md text-white"
        on:click={() => match.set(null)}
    >
        Play Again
    </button>
    {#if showReplay}
        <ReplayText {fontSize} {replay} {roomInfo} />
    {/if}
{:else}
    <WordDisplay
        {correctInput}
        {incorrectChars}
        {fontSize}
        matchUsers={Array.from(matchUsers.values())}
        {replay}
        {roomInfo}
    />
    <TestInput bind:replayText bind:replay {started} {roomInfo} />
{/if}
