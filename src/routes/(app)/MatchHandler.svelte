<script lang="ts">
    import { onMount } from "svelte";
    import { invalidateAll } from "$app/navigation";
    import { io } from "socket.io-client";
    import toast from "svelte-french-toast";
    import type { User } from "@prisma/client";

    import { guestAccountSeed } from "$lib/stores/guestAccountSeed";
    import { matchType } from "$lib/stores/matchType";
    import type { Replay, BasicRoomInfo, NewActionPayload } from "$lib/types";

    import CasualMatch from "./CasualMatch.svelte";
    import RankedMatch from "./RankedMatch.svelte";

    export let user: User;
    export let sessionId: string | undefined;

    let replay: Replay = [];
    let roomInfo: BasicRoomInfo | null = null;

    let finished = false;
    let countDown: number | null = null;

    let interval: ReturnType<typeof setInterval>;

    let previousReplayLength = 0;

    let socket = io({
        query: {
            token: sessionId ? sessionId : "",
            matchType: $matchType,
            guestAccountSeed: $guestAccountSeed,
        },
    });

    socket.on("error", (errorMessage: string) => {
        toast.error(errorMessage);
    });

    socket.on("connect", () => {
        // Quick way of checking if the user is a guest or not
        if (user.email === "" && socket.id) {
            user.id = socket.id;
        }
    });

    socket.on("disconnect", () => {
        if (roomInfo === null) {
            matchType.set(null);
        }

        finished = true;

        invalidateAll();
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
        return () => {
            socket.disconnect();

            if (interval) {
                clearInterval(interval);
            }
        };
    });

    interval = setInterval(() => {
        if (
            !roomInfo ||
            roomInfo.startTime === null ||
            roomInfo.quote === null
        ) {
            return;
        }

        const timeUntilStart = roomInfo.startTime - Date.now();

        if (timeUntilStart <= 0) {
            countDown = null;
        } else {
            countDown = Math.ceil(timeUntilStart / 1000);
        }
    }, 100);

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
            bind:finished
            bind:replay
            bind:socket
        />
    {:else if $matchType === "casual"}
        <CasualMatch
            {started}
            bind:user
            bind:roomInfo
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
