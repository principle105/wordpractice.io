<script lang="ts">
    import { io } from "socket.io-client";
    import type { User } from "lucia";
    import { useMatchMode } from "$lib/stores/store";
    import CasualMatch from "./CasualMatch.svelte";
    import RankedMatch from "./RankedMatch.svelte";
    import type { ExistingRoom, MatchUser, Replay, RoomInfo } from "$lib/types";
    import { onMount } from "svelte";

    export let user: User | undefined;
    export let sessionId: string | undefined;
    let replay: Replay = [];

    let roomInfo: RoomInfo;
    let matchUsers = new Map<string, MatchUser>();

    const match = useMatchMode();

    const socket = io({
        query: {
            token: sessionId ? sessionId : "",
        },
    });

    socket.on("user-disconnect", (userId: string) => {
        matchUsers.delete(userId);
        matchUsers = matchUsers;
    });

    socket.on("existing-room-info", (existingRoomInfo: ExistingRoom) => {
        if (existingRoomInfo.users.length !== 0) {
            matchUsers = new Map(
                existingRoomInfo.users.map((user) => [user.id, user])
            );
        }

        roomInfo = {
            quote: existingRoomInfo.quote,
            startTime: existingRoomInfo.startTime,
        };
    });

    socket.on("server-update-user", (matchUser: MatchUser) => {
        matchUsers.set(matchUser.id, matchUser);
        matchUsers = matchUsers;
    });

    socket.on("disconnect", () => {
        match.set(null);
    });

    const updateUser = (replay: Replay) => {
        if (replay.length === 0) return;

        socket.emit("client-update-user", replay);
    };

    onMount(() => {
        const interval = setInterval(() => {
            date = Date.now();

            if (roomInfo.startTime <= date) {
                clearInterval(interval);
            }
        }, 250);

        return () => {
            socket.disconnect();
            clearInterval(interval);
        };
    });

    let date: number = Date.now();
    $: replay, updateUser(replay);
</script>

{#if !roomInfo || $match === null}
    <div>Loading...</div>
{:else}
    {@const started = roomInfo.startTime <= date}
    {#if !started}
        <div
            class="absolute inset-0 bg-black/30 flex justify-center items-center"
        >
            <div class="text-5xl text-white">
                {Math.round((roomInfo.startTime - date) / 1000)}
            </div>
        </div>
    {/if}

    {#if $match.type === "ranked"}
        <RankedMatch
            userName={user ? user.name : "Guest"}
            {roomInfo}
            {matchUsers}
            {started}
            bind:replay
        />
    {:else if $match.type === "casual"}
        <CasualMatch />
    {:else if $match.type === "private"}
        <section>
            <div>Private Room</div>
        </section>
    {/if}
{/if}
