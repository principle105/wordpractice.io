<script lang="ts">
    import { onMount } from "svelte";
    import { invalidateAll } from "$app/navigation";
    import { io } from "socket.io-client";
    import toast from "svelte-french-toast";
    import type { User } from "@prisma/client";

    import { guestAccountSeed } from "$lib/stores/guestAccountSeed";
    import { matchType } from "$lib/stores/matchType";
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

    let previousReplayLength = 0;

    let socket = io({
        query: {
            token: sessionId ? sessionId : "",
            matchType: $matchType,
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
            matchType.set(null);
        }

        finished = true;

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

        if (previousReplayLength > replay.length) {
            previousReplayLength = 0;
        }

        const totalNewActions = replay.length - previousReplayLength;

        if (totalNewActions === 0) return;

        const newActions = replay.slice(-totalNewActions);

        socket.emit("new-action", {
            userId: user.id,
            actions: newActions,
        } satisfies NewActionPayload);

        previousReplayLength = replay.length;
    };

    onMount(() => {
        doCountDown();

        return () => {
            socket.disconnect();
        };
    });

    $: roomInfo, doCountDown();

    const doCountDown = () => {
        if (
            !roomInfo ||
            roomInfo.startTime === null ||
            roomInfo.quote === null
        ) {
            countDown = null;
            return;
        }

        countDown = Math.ceil((roomInfo.startTime - Date.now()) / 1000);

        const interval = setInterval(() => {
            if (countDown === 1 || countDown === null) {
                countDown = null;
                clearInterval(interval);
                return;
            }

            countDown -= 1;
        }, 1000);
    };

    $: replay, sendNewReplayAction(replay);
    $: started = countDown === null;
</script>

{#if $matchType === null}
    <div>Loading...</div>
{:else}
    {#if !started && !finished}
        <div
            class="fixed inset-0 bg-black/30 flex justify-center items-center z-10"
        >
            <div class="text-5xl text-white">
                {countDown}
            </div>
        </div>
    {/if}

    {#if $matchType === "ranked"}
        <RankedMatch
            {started}
            bind:user
            bind:roomInfo
            bind:matchUsers
            bind:finished
            bind:replay
            bind:socket
        />
    {:else if $matchType === "casual"}
        <CasualMatch
            {started}
            bind:user
            bind:roomInfo
            bind:matchUsers
            bind:finished
            bind:replay
            bind:socket
        />
    {:else if $matchType === "private"}
        <section>
            <div>Private Room</div>
        </section>
    {/if}
{/if}
