<script lang="ts">
    import type { PageData } from "./$types";
    import { useMatchMode } from "$lib/stores/store";
    import CasualMatch from "./CasualMatch.svelte";
    import RankedMatch from "./RankedMatch.svelte";
    import type { Match } from "$lib/types";

    const matchType = useMatchMode();

    const changeMatchType = (newMatchType: Match) => {
        matchType.set(newMatchType);
    };

    export let data: PageData;
</script>

{#if $matchType === null}
    {#if !data.user}
        <div>Create an account to save your progress.</div>
    {:else}
        <div>Logged in as {data.user?.id}</div>
    {/if}
    <section class="flex gap-2">
        <button
            class="bg-emerald-500 p-3 rounded-md text-white"
            on:click={() => changeMatchType("ranked")}
        >
            Ranked Mode
        </button>
        <button
            class="bg-red-600 p-3 rounded-md text-white"
            on:click={() => changeMatchType("casual")}
        >
            Casual Mode
        </button>
        <button class="bg-blue-600 p-3 rounded-md text-white">
            Create a Private Room
        </button>
    </section>
    <section>
        <div>Latest High Scores</div>
    </section>
{:else if $matchType === "ranked"}
    <RankedMatch />
{:else if $matchType === "casual"}
    <CasualMatch />
{:else if $matchType === "private"}
    <section>
        <div>Private Room</div>
    </section>
{/if}
