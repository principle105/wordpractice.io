<script lang="ts">
    import { onMount } from "svelte";
    import { invalidateAll } from "$app/navigation";
    import { io } from "socket.io-client";
    import toast from "svelte-french-toast";
    import type { User } from "@prisma/client";

    import { guestAccountSeed } from "$lib/stores/guestAccountSeed";
    import { match } from "$lib/stores/match";
    import type {
        MatchUser,
        Replay,
        BasicRoomInfo,
        NewActionPayload,
    } from "$lib/types";

    import CasualMatch from "./CasualMatch.svelte";
    import RankedMatch from "./RankedMatch.svelte";

    export let user: User;
    export let sessionId: string | undefined;

    let replay: Replay = [];
    let roomInfo: BasicRoomInfo | null = null;
    let matchUsers = new Map<string, MatchUser>();

    let finished = false;
    let countDown: number | null = null;
    let interval: ReturnType<typeof setInterval>;

    let previousReplayLength = 0;

    let socket = io({
        query: {
            token: sessionId ? sessionId : "",
            matchType: $match?.type,
            guestAccountSeed: $guestAccountSeed,
        },
    });

    socket.on("user-disconnect", (userId: string) => {
        let disconnectedUser = matchUsers.get(userId);

        if (!disconnectedUser) return;

        disconnectedUser.connected = false;
        matchUsers.set(userId, disconnectedUser);
        matchUsers = matchUsers;
    });

    socket.on("error", (errorMessage: string) => {
        toast.error(errorMessage);
    });

    socket.on("update-start-time", (startTime: number | null) => {
        if (roomInfo === null) return;

        roomInfo = { ...roomInfo, startTime };
    });

    socket.on("new-action", (newActionPayload: NewActionPayload) => {
        let matchUser = matchUsers.get(newActionPayload.userId);

        if (!matchUser) return;

        // Adding the new actions to the user's replay
        matchUser.replay = matchUser.replay.concat(newActionPayload.actions);

        matchUsers.set(matchUser.id, matchUser);
        matchUsers = matchUsers;
    });

    socket.on("new-user", (newUser: MatchUser) => {
        if (matchUsers.has(newUser.id)) return;

        matchUsers.set(newUser.id, newUser);
        matchUsers = matchUsers;
    });

    socket.on("match-ended", () => {
        if (finished === false) {
            finished = true;
            toast.error("The match reached the maximum time limit.");
        }

        matchUsers = new Map(
            Array.from(matchUsers, ([id, user]) => [
                id,
                { ...user, connected: false } satisfies MatchUser,
            ])
        );
    });

    socket.on("disconnect", () => {
        if (roomInfo === null) {
            match.set(null);
        }

        finished = true;

        if (interval) clearInterval(interval);

        invalidateAll();
    });

    socket.on("connect", () => {
        // Quick way of checking if the user is a guest or not
        if (user.email === "" && socket.id) {
            user.id = socket.id;
        }
    });

    const sendNewReplayAction = (replay: Replay) => {
        if (replay.length === 0) return;

        const totalNewActions = replay.length - previousReplayLength;

        if (totalNewActions === 0) return;

        if (totalNewActions < 0) {
            throw new Error("Something went wrong with the replay.");
        }

        const newActions = replay.slice(-totalNewActions);

        socket.emit("new-action", {
            userId: user.id,
            actions: newActions,
        } satisfies NewActionPayload);

        previousReplayLength = replay.length;
    };

    onMount(() => {
        interval = setInterval(() => {
            if (!roomInfo) {
                return;
            }

            if (roomInfo.startTime === null) {
                countDown = null;
                return;
            }

            // Adding 1 to prevent the user from starting too early
            countDown =
                1 + Math.round((roomInfo.startTime - Date.now()) / 1000);

            if (countDown <= 0) {
                clearInterval(interval);
            }
        }, 100);

        return () => {
            socket.disconnect();
            clearInterval(interval);
        };
    });

    $: replay, sendNewReplayAction(replay);
    $: started = !!(countDown !== null && countDown <= 0);
</script>

{#if $match === null}
    <div>Loading...</div>
{:else}
    {#if !started && !finished && countDown !== null}
        <div
            class="fixed inset-0 bg-black/30 flex justify-center items-center z-10"
        >
            <div class="text-5xl text-white">
                {countDown}
            </div>
        </div>
    {/if}

    {#if $match.type === "ranked"}
        <RankedMatch
            {user}
            bind:roomInfo
            {matchUsers}
            {started}
            {finished}
            bind:replay
            bind:socket
        />
    {:else if $match.type === "casual"}
        <CasualMatch
            {user}
            bind:roomInfo
            {matchUsers}
            {started}
            {finished}
            bind:replay
            bind:socket
        />
    {:else if $match.type === "private"}
        <section>
            <div>Private Room</div>
        </section>
    {/if}
{/if}
