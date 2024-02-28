<script lang="ts">
    import { onMount } from "svelte";
    import { invalidateAll } from "$app/navigation";
    import { io } from "socket.io-client";
    import type { User } from "lucia";

    import type { Room, MatchUser, Replay, RoomInfo } from "$lib/types";
    import { useMatchMode } from "$lib/stores/store";
    import { DEFAULT_FONT_SCALE } from "$lib/config";

    import CasualMatch from "./CasualMatch.svelte";
    import RankedMatch from "./RankedMatch.svelte";
    import toast from "svelte-french-toast";

    export let user: User | undefined;
    export let sessionId: string | undefined;

    let replay: Replay = [];
    let roomInfo: RoomInfo | null = null;
    let matchUsers = new Map<string, MatchUser>();
    let finished = false;
    let countDown: number | null = null;
    let interval: ReturnType<typeof setInterval>;

    const match = useMatchMode();

    const socket = io({
        query: {
            token: sessionId ? sessionId : "",
            matchType: $match?.type,
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

    const getUser = (user: User | undefined) => {
        if (user) return user;

        // TODO: eventually fetch this from the local storage
        return {
            id: "",
            userId: "",
            name: "Guest",
            email: "",
            rating: 0,
            fontScale: DEFAULT_FONT_SCALE,
            avatar: "",
        } satisfies User;
    };

    $: replay, updateUser(replay);
    $: started = !!(countDown !== null && countDown <= 0);
</script>

{#if !roomInfo || $match === null}
    <div>Loading...</div>
{:else}
    {#if !started}
        <div
            class="absolute inset-0 bg-black/30 flex justify-center items-center"
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
            user={getUser(user)}
            {roomInfo}
            {matchUsers}
            {started}
            {finished}
            bind:replay
            {socket}
        />
    {:else if $match.type === "casual"}
        <CasualMatch
            user={getUser(user)}
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
