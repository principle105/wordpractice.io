<script lang="ts">
    import type {
        BasicRoomInfo,
        BasicRoomInfoStarted,
        Replay,
    } from "$lib/types";
    import type { User } from "@prisma/client";
    import MatchStats from "./MatchStats.svelte";
    import ReplayText from "./ReplayText.svelte";
    import { BASE_FONT_SIZE } from "$lib/config";

    export let user: User;
    export let roomInfo: BasicRoomInfo;
    export let replays: { [key: string]: Replay };

    let showReplay = false;
    let replay: Replay | null = replays[Object.keys(replays)[0]] ?? null;

    const fontSize: number = user.fontScale * BASE_FONT_SIZE;

    $: startedRoomInfo = roomInfo as BasicRoomInfoStarted;
    $: raceStarted = !(roomInfo.startTime === null || roomInfo.quote === null);

    const changeReplay = (replayName: string) => {
        replay = replays[replayName];
    };
</script>

<div>New Rating: {user.rating}</div>
{#if replay !== null}
    <div>
        {#if Object.keys(replays).length > 1}
            <div class="flex gap-5">
                {#each Object.keys(replays) as replayName}
                    <button on:click={() => changeReplay(replayName)}>
                        {replayName}
                    </button>
                {/each}
            </div>
        {/if}
        <button
            class="bg-zinc-500 p-3 rounded-md text-white"
            on:click={() => (showReplay = true)}
        >
            Replay
        </button>
        {#if raceStarted}
            <MatchStats {replay} {startedRoomInfo} />
        {/if}
        {#if showReplay}
            <ReplayText {fontSize} {replay} {startedRoomInfo} />
        {/if}
    </div>
{/if}
