<script lang="ts">
    import type { User } from "@prisma/client";
    import type {
        BasicRoomInfo,
        BasicRoomInfoStarted,
        CasualMatchUser,
        Round,
    } from "$lib/types";

    import RoundStats from "./RoundStats.svelte";
    import ReplayText from "./ReplayText.svelte";

    export let user: User;
    export let roomInfo: BasicRoomInfo;
    export let prevRounds: Round[];
    export let matchUsers = new Map<string, CasualMatchUser>();

    let showReplay = false;
    let roundNumber = 0;

    $: activeRound = prevRounds[roundNumber];

    $: startedRoomInfo = roomInfo as BasicRoomInfoStarted;
</script>

{#if activeRound}
    <div>
        {#if prevRounds.length > 1}
            <div class="flex gap-5">
                {#each prevRounds as _, i}
                    <button
                        on:click={() => {
                            roundNumber = i;
                        }}
                        class="underline-offset-[3px] {roundNumber === i
                            ? 'underline'
                            : ''}"
                    >
                        Round {i + 1}
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

        <!-- Checking if the race started -->
        {#if !(roomInfo.startTime === null || roomInfo.quote === null)}
            <RoundStats round={activeRound} {startedRoomInfo} {user} />
        {/if}

        {#if showReplay}
            <ReplayText round={activeRound} {matchUsers} {user} />
        {/if}
    </div>
{/if}
