<script lang="ts">
    // TODO: add max wrong characters and add server-side validation for it
    import type { User } from "@prisma/client";
    import type { Socket } from "socket.io-client";
    import { defaultMatch } from "$lib/constants";

    import type {
        MatchUser,
        Replay,
        BasicRoomInfo,
        RankedRoom,
    } from "$lib/types";
    import { match } from "$lib/stores/match";
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

    socket.on("ranked:existing-room-info", (existingRoomInfo: RankedRoom) => {
        matchUsers = new Map(Object.entries(existingRoomInfo.users));

        // Separating the room info from the users to avoid rerendering static data when the uses change
        roomInfo = {
            id: existingRoomInfo.id,
            quote: existingRoomInfo.quote,
            startTime: existingRoomInfo.startTime,
            matchType: existingRoomInfo.matchType,
        };

        scores = new Map(Object.entries(existingRoomInfo.scores));
    });

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

    const playAgain = () => {
        match.set(null);
        socket.disconnect();

        setTimeout(() => {
            match.update((m) => {
                if (m === null) {
                    return { ...defaultMatch, type: "ranked" };
                }

                m.type = "ranked";
                return m;
            });
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

<MatchContainer {finished} {roomInfo}>
    <div slot="racers" class="flex flex-col gap-3" let:startedRoomInfo>
        <OpponentDisplay
            matchUser={clientMatchUser}
            {startedRoomInfo}
            bind:finished
            showRating={true}
        />

        {#each matchUsers.values() as matchUser}
            <OpponentDisplay {matchUser} {startedRoomInfo} showRating={true} />
        {/each}
    </div>

    <div slot="end-screen" let:startedRoomInfo>
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
        bind:replay
        {started}
        let:startedRoomInfo
        {startedRoomInfo}
    />

    <div slot="waiting">
        <div>WAITING</div>
    </div>

    <div slot="loading">
        <div class="flex justify-center items-center h-[86vh]">
            <div
                class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-zinc-500"
            />
        </div>
    </div>
</MatchContainer>
