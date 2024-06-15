<script lang="ts">
    // TODO: add max wrong characters and add server-side validation for it
    import type { User } from "@prisma/client";
    import type { Socket } from "socket.io-client";
    import toast from "svelte-french-toast";

    import type {
        CasualRoom,
        CasualMatchUser,
        Replay,
        BasicRoomInfo,
        NewActionPayload,
    } from "$lib/types";
    import { matchType } from "$lib/stores/matchType";
    import { BASE_FONT_SIZE } from "$lib/config";

    import OpponentDisplay from "$lib/components/match/OpponentDisplay.svelte";
    import WordDisplay from "$lib/components/match/WordDisplay.svelte";
    import TestInput from "$lib/components/match/TestInput.svelte";
    import MatchContainer from "$lib/components/layout/MatchContainer.svelte";
    import EndScreen from "$lib/components/match/EndScreen.svelte";

    export let user: User;
    export let roomInfo: BasicRoomInfo | null;
    export let matchUsers = new Map<string, CasualMatchUser>();
    export let replay: Replay = [];
    export let started: boolean;
    export let socket: Socket;
    export let finished: boolean;

    const fontSize: number = user.fontScale * BASE_FONT_SIZE;

    socket.on("user-disconnect", (userId: string) => {
        let disconnectedUser = matchUsers.get(userId);

        if (!disconnectedUser) return;

        disconnectedUser.connected = false;
        matchUsers.set(userId, disconnectedUser);
        matchUsers = matchUsers;
    });

    socket.on("new-action", (newActionPayload: NewActionPayload) => {
        let matchUser = matchUsers.get(newActionPayload.userId);

        if (!matchUser) return;

        // Adding the new actions to the user's replay
        matchUser.replay = matchUser.replay.concat(newActionPayload.actions);

        matchUsers.set(matchUser.id, matchUser);
        matchUsers = matchUsers;
    });

    socket.on("casual:new-user", (newUser: CasualMatchUser) => {
        if (matchUsers.has(newUser.id)) return;

        matchUsers.set(newUser.id, newUser);
        matchUsers = matchUsers;
    });

    socket.on("casual:match-expired", () => {
        if (finished === false) {
            finished = true;
            toast.error("The match reached the maximum time limit.");
        }

        matchUsers = new Map(
            Array.from(matchUsers, ([id, user]) => [
                id,
                { ...user, connected: false } satisfies CasualMatchUser,
            ])
        );
    });

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
        matchType.set(null);
        socket.disconnect();

        setTimeout(() => {
            matchType.set("casual");
        });
    };

    $: clientMatchUser = {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        rating: user.rating,
        connected: true,
        replay,
    } satisfies CasualMatchUser;
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

    <div slot="end-screen">
        {#if roomInfo !== null}
            <EndScreen {user} {roomInfo} replays={{ replay }} />
        {/if}

        <button
            class="bg-emerald-500 p-3 rounded-md text-white"
            on:click={playAgain}
        >
            Play Again
        </button>
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

    <div slot="loading">
        <div class="flex justify-center items-center h-[86vh]">
            <div
                class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-zinc-500"
            />
        </div>
    </div>
</MatchContainer>
