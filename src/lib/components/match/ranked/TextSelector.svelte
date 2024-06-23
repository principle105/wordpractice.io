<script lang="ts">
    import { createEventDispatcher } from "svelte";

    import type { TextCategory } from "$lib/types";
    import { textCategories } from "$lib/constants";

    export let blacklist: TextCategory[] = [];
    export let quoteSelectionDecisionEndTime: number | null = null;
    export let currentTime: number;

    const dispatch = createEventDispatcher<{
        selection: TextCategory;
    }>();

    let selection: TextCategory | null = null;

    const makeSelection = (textCategory: TextCategory) => {
        selection = textCategory;
    };

    const confirmSelection = () => {
        if (selection === null) return;

        dispatch("selection", selection);
    };
</script>

<div>Choose a text category</div>

<div>
    {#if quoteSelectionDecisionEndTime}
        {@const timeLeft = Math.max(
            0,
            quoteSelectionDecisionEndTime - currentTime
        )}
        <p>Time left: {Math.floor(timeLeft / 1000)}</p>
    {/if}
</div>

<div class="grid grid-cols-3 gap-4">
    {#each Object.entries(textCategories) as [textCategoryName, textCategory]}
        {@const isCategorySelected = selection === textCategory}
        {@const isCategoryBlacklisted = blacklist.includes(textCategory)}

        <button
            class="border bg-zinc-100 p-5 text-center rounded-lg disabled:opacity-30"
            class:border-emerald-400={isCategorySelected}
            disabled={isCategoryBlacklisted}
            on:click={() => makeSelection(textCategory)}
        >
            {textCategoryName}
        </button>
    {/each}
</div>
{#if selection !== null}
    <button
        class="bg-emerald-500 p-3 rounded-md text-white"
        on:click={confirmSelection}
    >
        Select
    </button>
{/if}
