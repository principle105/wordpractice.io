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
    let replay: Replay = replays[Object.keys(replays)[0]];

    const fontSize: number = user.fontScale * BASE_FONT_SIZE;

    $: startedRoomInfo = roomInfo as BasicRoomInfoStarted;
    $: raceStarted = !(roomInfo.startTime === null || roomInfo.quote === null);

    const changeReplay = (replayName: string) => {
        replay = replays[replayName];
    };
</script>

<div>
    <div class="flex gap-5">
        {#each Object.keys(replays) as replayKey}
            <button>{replayKey}</button>
        {/each}
    </div>
    {#if raceStarted}
        <MatchStats {replay} {startedRoomInfo} />
    {/if}
</div>
<button
    class="bg-zinc-500 p-3 rounded-md text-white"
    on:click={() => (showReplay = true)}
>
    Replay
</button>

{#if showReplay}
    <ReplayText {fontSize} {replay} {startedRoomInfo} />
{/if}
