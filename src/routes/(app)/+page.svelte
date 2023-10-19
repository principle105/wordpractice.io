<script lang="ts">
    import type { PageData } from "./$types";
    import { defaultMatch, type Match } from "$lib/types";
    import { useMatchMode } from "$lib/stores/store";

    import MatchHandler from "./MatchHandler.svelte";
    import CasualMatch from "./CasualMatch.svelte";

    export let data: PageData;

    const match = useMatchMode();

    const changeMatchType = (newMatchType: Match["type"]) => {
        match.update((m) => {
            if (m === null) {
                return { ...defaultMatch, type: newMatchType };
            }

            m.type = newMatchType;
            return m;
        });
    };
</script>

{#if $match === null}
    {#if !data.user}
        <div>Create an account to save your progress.</div>
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
{:else}
    <MatchHandler sessionId={data.sessionId} user={data.user} />
{/if}
