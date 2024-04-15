<script lang="ts">
    import { createEventDispatcher } from "svelte";

    import type { TextCategory } from "$lib/types";
    import { textCategories } from "$lib/constants";

    const dispatch = createEventDispatcher<{
        selection: TextCategory;
    }>();

    export let blacklist: TextCategory[] = [];

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

<div class="grid grid-cols-3 gap-4">
    {#each Object.entries(textCategories) as [textCategoryName, textCategory]}
        {@const isCategorySelected = selection === textCategory}
        {@const isCategoryBlacklisted = blacklist.includes(textCategory)}

        <button
            class="border bg-zinc-100 p-5 text-center rounded-lg disabled:opacity-30 {isCategorySelected &&
                'border-red-400'}"
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
