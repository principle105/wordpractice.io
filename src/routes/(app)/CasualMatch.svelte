<script lang="ts">
    // TODO: add max wrong characters and add server-side validation for it
    import type { User } from "@prisma/client";
    import type { Socket } from "socket.io-client";

    import type {
        CasualRoom,
        MatchUser,
        Replay,
        BasicRoomInfo,
    } from "$lib/types";
    import { defaultMatch } from "$lib/constants";
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

    let showReplay = false;

    const fontSize: number = user.fontScale * BASE_FONT_SIZE;

    socket.on("casual:new-room-info", (newRoomInfo: CasualRoom) => {
        for (const [id, matchUser] of Object.entries(newRoomInfo.users)) {
            if (id === user.id) {
                replay = matchUser.replay;
                continue;
            }

            matchUsers.set(id, matchUser);
        }

        matchUsers = matchUsers;

        // Separating the room info from the users to avoid rerendering static data when the uses change
        roomInfo = {
            id: newRoomInfo.id,
            quote: newRoomInfo.quote,
            startTime: newRoomInfo.startTime,
            matchType: newRoomInfo.matchType,
        };
    });

    const playAgain = () => {
        match.set(null);
        socket.disconnect();

        setTimeout(() => {
            match.update((m) => {
                if (m === null) {
                    return { ...defaultMatch, matchType: "casual" };
                }

                m.matchType = "casual";
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
    <title>Casual Match - WordPractice</title>
</svelte:head>

<MatchContainer {finished} {started} {roomInfo}>
    <div slot="racers" class="flex flex-col gap-3" let:startedRoomInfo>
        <OpponentDisplay
            matchUser={clientMatchUser}
            {startedRoomInfo}
            bind:finished
        />
        {#each matchUsers.values() as matchUser}
            <OpponentDisplay {matchUser} {startedRoomInfo} />
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
