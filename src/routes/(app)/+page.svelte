<script lang="ts">
    import type { PageData } from "./$types";
    import { defaultMatch, type MatchType } from "$lib/types";
    import { match } from "$lib/stores/match";
    import toast from "svelte-french-toast";

    import MatchHandler from "./MatchHandler.svelte";

    export let data: PageData;

    const changeMatchType = (newMatchType: MatchType) => {
        if (newMatchType === "ranked" && !data.user) {
            toast.error("You need to be logged in to play ranked mode.");
            return;
        }

        match.update((m) => {
            if (m === null) {
                return { ...defaultMatch, type: newMatchType };
            }

            m.type = newMatchType;
            return m;
        });
    };
</script>

<svelte:head>
    <title>WordPractice</title>
</svelte:head>

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
