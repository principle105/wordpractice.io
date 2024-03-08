<script lang="ts">
    import { onMount } from "svelte";
    import { invalidateAll } from "$app/navigation";
    import { io } from "socket.io-client";
    import toast from "svelte-french-toast";
    import type { User } from "lucia";

    import type { Room, MatchUser, Replay, RoomInfo } from "$lib/types";
    import { match } from "$lib/stores/match";
    import { guestAccountSeed } from "$lib/stores/guestAccountSeed";

    import CasualMatch from "./CasualMatch.svelte";
    import RankedMatch from "./RankedMatch.svelte";

    export let user: User;
    export let sessionId: string | undefined;

    let replay: Replay = [];
    let roomInfo: RoomInfo | null = null;
    let matchUsers = new Map<string, MatchUser>();
    let finished = false;
    let countDown: number | null = null;
    let interval: ReturnType<typeof setInterval>;

    const socket = io({
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

    socket.on("existing-room-info", (existingRoomInfo: Room) => {
        matchUsers = new Map(Object.entries(existingRoomInfo.users));

        // Separating the room info from the users to avoid rerendering static data when the uses change
        roomInfo = {
            roomId: existingRoomInfo.roomId,
            quote: existingRoomInfo.quote,
            startTime: existingRoomInfo.startTime,
            matchType: existingRoomInfo.matchType,
        };
    });

    socket.on("error", (errorMessage: string) => {
        toast.error(errorMessage);
    });

    socket.on("update-start-time", (startTime: number | null) => {
        if (roomInfo === null) return;

        roomInfo = { ...roomInfo, startTime };
    });

    socket.on("update-user", (matchUser: MatchUser) => {
        matchUsers.set(matchUser.id, matchUser);
        matchUsers = matchUsers;
    });

    socket.on("match-ended", () => {
        if (finished === false) {
            finished = true;
            toast.error("Sorry the match has ended.");
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

    const updateUser = (replay: Replay) => {
        if (replay.length === 0) return;

        socket.emit("update-user", replay);
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

    $: replay, updateUser(replay);
    $: started = !!(countDown !== null && countDown <= 0);
</script>

{#if !roomInfo || $match === null}
    <div>Loading...</div>
{:else}
    {#if !started && !finished}
        <div
            class="fixed inset-0 bg-black/30 flex justify-center items-center z-10"
        >
            <div class="text-5xl text-white">
                {#if countDown === null}
                    {#if $match.type === "ranked"}
                        Waiting for players...
                    {/if}
                {:else}
                    {countDown}
                {/if}
            </div>
        </div>
    {/if}

    {#if $match.type === "ranked"}
        <RankedMatch
            {user}
            {roomInfo}
            {matchUsers}
            {started}
            {finished}
            bind:replay
            {socket}
        />
    {:else if $match.type === "casual"}
        <CasualMatch
            {user}
            {roomInfo}
            {matchUsers}
            {started}
            {finished}
            bind:replay
            {socket}
        />
    {:else if $match.type === "private"}
        <section>
            <div>Private Room</div>
        </section>
    {/if}
{/if}
