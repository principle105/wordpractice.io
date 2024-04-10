<script lang="ts">
    // TODO: add max wrong characters and add server-side validation for it
    import type { User } from "@prisma/client";
    import type { Socket } from "socket.io-client";

    import type {
        MatchUser,
        Replay,
        BasicRoomInfo,
        RankedRoom,
    } from "$lib/types";
    import { matchType } from "$lib/stores/matchType";
    import { BASE_FONT_SIZE } from "$lib/config";

    import OpponentDisplay from "$lib/components/match/OpponentDisplay.svelte";
    import ReplayText from "$lib/components/match/ReplayText.svelte";
    import WordDisplay from "$lib/components/match/WordDisplay.svelte";
    import TestInput from "$lib/components/match/TestInput.svelte";
    import MatchContainer from "$lib/components/layout/MatchContainer.svelte";
    import EndScreen from "$lib/components/match/EndScreen.svelte";

    export let user: User;
    export let roomInfo: BasicRoomInfo | null;
    export let matchUsers = new Map<string, MatchUser>();
    export let replay: Replay = [];
    export let started: boolean;
    export let socket: Socket;
    export let finished: boolean;

    let scores: Map<string, number> = new Map();

    let showReplay = false;

    const fontSize: number = user.fontScale * BASE_FONT_SIZE;

    socket.on("ranked:new-room-info", (newRoomInfo: RankedRoom) => {
        matchUsers = new Map(
            Object.entries(newRoomInfo.users).filter(([id]) => id !== user.id)
        );

        // Separating the room info from the users to avoid rerendering static data when the uses change
        roomInfo = {
            id: newRoomInfo.id,
            quote: newRoomInfo.quote,
            startTime: newRoomInfo.startTime,
            matchType: newRoomInfo.matchType,
        };

        scores = new Map(Object.entries(newRoomInfo.scores));
    });

    socket.on("ranked:update-room-info", (newRoomInfo: RankedRoom) => {
        for (const [id, matchUser] of Object.entries(newRoomInfo.users)) {
            if (id === user.id) {
                user.rating = matchUser.rating;
                replay = matchUser.replay;
                continue;
            }

            matchUsers.set(id, matchUser);
        }

        matchUsers = matchUsers;

        roomInfo = {
            id: newRoomInfo.id,
            quote: newRoomInfo.quote,
            startTime: newRoomInfo.startTime,
            matchType: newRoomInfo.matchType,
        };

        scores = new Map(Object.entries(newRoomInfo.scores));
    });

    const playAgain = () => {
        matchType.set(null);
        socket.disconnect();

        setTimeout(() => {
            matchType.set("ranked");
        });
    };

    $: clientMatchUser = {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        rating: user.rating,
        connected: true,
        replay,
    } satisfies MatchUser;
</script>

<svelte:head>
    <title>Ranked Match - WordPractice</title>
</svelte:head>

<MatchContainer {finished} {started} {roomInfo}>
    <div slot="racers" class="flex flex-col gap-3" let:startedRoomInfo>
        <OpponentDisplay
            matchUser={clientMatchUser}
            {startedRoomInfo}
            showRating={true}
        />

        {#each matchUsers.values() as matchUser}
            <OpponentDisplay {matchUser} {startedRoomInfo} showRating={true} />
        {/each}
    </div>

    <div slot="end-screen" let:startedRoomInfo>
        <div class="mt-16 flex flex-col justify-center">
            <h2 class="text-3xl">Your Stats</h2>
            <EndScreen {replay} {startedRoomInfo} />
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
            <ReplayText {fontSize} {replay} {startedRoomInfo} />
        {/if}
    </div>

    <WordDisplay
        slot="word-display"
        let:startedRoomInfo
        {fontSize}
        matchUsers={Array.from(matchUsers.values())}
        {replay}
        {startedRoomInfo}
    />

    <TestInput
        slot="input"
        let:startedRoomInfo
        bind:replay
        {started}
        {startedRoomInfo}
    />

    <div slot="waiting">
        <div>Waiting for a player to join</div>
    </div>

    <div slot="loading">
        <div class="flex justify-center items-center h-[86vh]">
            <div
                class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-zinc-500"
            />
        </div>
    </div>
</MatchContainer>
