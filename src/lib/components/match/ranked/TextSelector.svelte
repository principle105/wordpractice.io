<script lang="ts">
    import { createEventDispatcher } from "svelte";

    import { textCategories, type TextCategory } from "$lib/types";

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

<div class="grid grid-cols-3 gap-4">
    {#each textCategories as textCategory}
        {@const isSelected = selection === textCategory}
        <button
            class="border bg-zinc-100 p-5 text-center rounded-lg {isSelected
                ? 'border-emerald-400'
                : ''}"
            on:click={() => makeSelection(textCategory)}
        >
            {textCategory}
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
