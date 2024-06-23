<script lang="ts">
    import { onMount } from "svelte";
    import type { User } from "@prisma/client";
    import type { Socket } from "socket.io-client";
    import toast from "svelte-french-toast";

    import type {
        RankedMatchUser,
        Replay,
        BasicRoomInfo,
        RankedRoom,
        NewActionPayload,
        Round,
        Replays,
    } from "$lib/types";
    import { matchType } from "$lib/stores/matchType";
    import { BEST_OF } from "$lib/config";
    import type { TextCategory } from "$lib/types";
    import { textCategoryToName } from "$lib/utils/conversions";

    import OpponentDisplay from "$lib/components/match/OpponentDisplay.svelte";
    import WordDisplay from "$lib/components/match/WordDisplay.svelte";
    import TestInput from "$lib/components/match/TestInput.svelte";
    import MatchContainer from "$lib/components/layout/MatchContainer.svelte";
    import OpponentSearch from "$lib/components/match/ranked/OpponentSearch.svelte";
    import TextEliminator from "$lib/components/match/ranked/TextEliminator.svelte";
    import TextSelector from "$lib/components/match/ranked/TextSelector.svelte";
    import WaitingForOpponent from "$lib/components/match/ranked/WaitingForOpponent.svelte";
    import EndScreen from "$lib/components/match/EndScreen.svelte";
    import MatchStats from "$lib/components/match/MatchStats.svelte";

    export let user: User;
    export let roomInfo: BasicRoomInfo | null;
    export let matchUsers = new Map<string, RankedMatchUser>();
    export let replay: Replay = [];
    export let started: boolean;
    export let socket: Socket;
    export let finished: boolean;

    let minSearchRating = 0;
    let maxSearchRating = 0;

    let isFirstUserToBlacklist = false;
    let blacklist: TextCategory[] = [];
    let blacklistDecisionEndTime: number | null;
    let quoteSelectionDecisionEndTime: number | null;

    let currentTime: number = Date.now();
    let score = 0;
    let prevRounds: Round[] = [];

    $: roundNumber = prevRounds.length + 1;

    socket.on("user-disconnect", (userId: string) => {
        let disconnectedUser = matchUsers.get(userId);

        if (!disconnectedUser) return;

        toast.error("Opponent disconnected.");

        disconnectedUser.connected = false;
        matchUsers.set(userId, disconnectedUser);
        matchUsers = matchUsers;

        finished = true;
    });

    socket.on("new-action", (newActionPayload: NewActionPayload) => {
        let matchUser = matchUsers.get(newActionPayload.userId);

        if (!matchUser) return;

        // Adding the new actions to the user's replay
        matchUser.replay = matchUser.replay.concat(newActionPayload.actions);

        matchUsers.set(matchUser.id, matchUser);
        matchUsers = matchUsers;
    });

    socket.on("ranked:match-expired", () => {
        if (finished === false) {
            finished = true;
            toast.error("The match reached the maximum time limit.");
        }
    });

    socket.on("ranked:new-room-info", (newRoomInfo: RankedRoom) => {
        toast.success("Opponent found!");

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

        blacklist = newRoomInfo.blacklistedTextCategories;
        blacklistDecisionEndTime = newRoomInfo.blacklistDecisionEndTime;
        quoteSelectionDecisionEndTime =
            newRoomInfo.quoteSelectionDecisionEndTime;
        prevRounds = newRoomInfo.prevRounds;

        isFirstUserToBlacklist = newRoomInfo.firstUserToBlacklist === user.id;
    });

    socket.on("ranked:update-room-info", (newRoomInfo: RankedRoom) => {
        for (const [id, matchUser] of Object.entries(newRoomInfo.users)) {
            if (id === user.id) {
                user.rating = matchUser.rating;
                replay = matchUser.replay;
                score = matchUser.score;
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

        blacklist = newRoomInfo.blacklistedTextCategories;
        blacklistDecisionEndTime = newRoomInfo.blacklistDecisionEndTime;
        quoteSelectionDecisionEndTime =
            newRoomInfo.quoteSelectionDecisionEndTime;
        prevRounds = newRoomInfo.prevRounds;

        isFirstUserToBlacklist = newRoomInfo.firstUserToBlacklist === user.id;
    });

    socket.on("ranked:waiting-for-match", (ratingPayload: [number, number]) => {
        const [minRating, maxRating] = ratingPayload;

        minSearchRating = minRating;
        maxSearchRating = maxRating;
    });

    onMount(() => {
        const interval = setInterval(() => {
            currentTime = Date.now();
        }, 100);

        return () => clearInterval(interval);
    });

    const playAgain = () => {
        matchType.set(null);
        socket.disconnect();

        setTimeout(() => {
            matchType.set("ranked");
        });
    };

    const onElimination = (textCategory: TextCategory) => {
        socket.emit("ranked:elimination", textCategory);
    };

    const onSelection = (textCategory: TextCategory) => {
        socket.emit("ranked:selection", textCategory);
    };

    const showMatchOutcome = () => {
        if (!finished) return;

        // Check if opponent is disconnected
        if (
            Array.from(matchUsers.values()).some(
                (matchUser) => !matchUser.connected
            )
        ) {
            toast.success("You win!");
            return;
        }

        // Check if you won by score
        const wonByScore = Array.from(matchUsers.values()).every(
            (matchUser) => matchUser.score < score
        );

        if (wonByScore) {
            toast.success("You won!");
            return;
        }

        toast.error("You lost!");
    };

    const getReplays = (
        matchUsers: Map<string, RankedMatchUser>,
        replay: Replay
    ): Replays => {
        const replays: Replays = {};

        for (const [matchUserId, matchUser] of matchUsers.entries()) {
            replays[matchUserId] = matchUser.replay;
        }

        replays[user.id] = replay;

        return replays;
    };

    $: finished, showMatchOutcome();
</script>

<svelte:head>
    <title>Ranked Match - WordPractice</title>
</svelte:head>

<MatchContainer {finished} {started} {roomInfo}>
    <div slot="racers" let:startedRoomInfo>
        <div class="flex justify-between">
            <div>
                <div>{textCategoryToName(startedRoomInfo.quote.category)}</div>
                <div>"{startedRoomInfo.quote.source}"</div>
            </div>
            <div>
                <div>Round {roundNumber}</div>
                <div>Best of {BEST_OF}</div>
            </div>
        </div>
        <OpponentDisplay
            matchUser={{
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                rating: user.rating,
                connected: true,
                replay,
            }}
            {startedRoomInfo}
            showRating={true}
        />

        {#each matchUsers.values() as matchUser}
            <OpponentDisplay {matchUser} {startedRoomInfo} showRating={true} />
        {/each}
    </div>

    <div slot="end-screen">
        {#if roomInfo !== null}
            <EndScreen>
                <div slot="overview">
                    <div>Ranked Match</div>
                    <div>New Rating: {user.rating}</div>
                </div>
                <div slot="stats">
                    <MatchStats {user} {roomInfo} {prevRounds} {matchUsers} />
                </div>
            </EndScreen>
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
        {user}
        round={{
            quote: startedRoomInfo.quote,
            startTime: startedRoomInfo.startTime,
            replays: getReplays(matchUsers, replay),
        }}
        {matchUsers}
    />

    <TestInput
        slot="input"
        let:startedRoomInfo
        bind:replay
        {started}
        {startedRoomInfo}
    />

    <div slot="before-start">
        {@const isEliminating =
            roundNumber % 2 === (isFirstUserToBlacklist ? 0 : 1)}
        <div>
            {user.username} vs {Array.from(matchUsers.values())
                .map((matchUser) => matchUser.username)
                .join(", ")}
        </div>

        {#if !isEliminating}
            {#if blacklist.length === roundNumber}
                <TextSelector
                    on:selection={(e) => onSelection(e.detail)}
                    {blacklist}
                    {quoteSelectionDecisionEndTime}
                    {currentTime}
                />
            {:else}
                <WaitingForOpponent
                    endTime={blacklistDecisionEndTime}
                    {currentTime}
                >
                    Waiting for your opponent to eliminate a text category...
                </WaitingForOpponent>
            {/if}
        {:else if blacklist.length !== roundNumber}
            <TextEliminator
                on:selection={(e) => onElimination(e.detail)}
                {blacklist}
                {blacklistDecisionEndTime}
                {currentTime}
            />
        {:else}
            <WaitingForOpponent
                endTime={quoteSelectionDecisionEndTime}
                {currentTime}
            >
                Waiting for your opponent to select a text category...
            </WaitingForOpponent>
        {/if}
    </div>

    <div slot="loading" class="h-full">
        {#if minSearchRating === 0 && maxSearchRating === 0}
            <div class="flex justify-center items-center h-[86vh]">
                <div
                    class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-zinc-500"
                />
            </div>
        {:else}
            <OpponentSearch {minSearchRating} {maxSearchRating} />
        {/if}
    </div>
</MatchContainer>
