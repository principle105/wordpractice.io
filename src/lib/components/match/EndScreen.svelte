<script lang="ts">
    let pageIndex = 0;
</script>

<div class="flex gap-1 underline-offset-[3px] h-full">
    <button class:underline={pageIndex === 0} on:click={() => (pageIndex = 0)}>
        Overview
    </button>
    <button class:underline={pageIndex === 1} on:click={() => (pageIndex = 1)}>
        Stats
    </button>
</div>

{#if pageIndex === 0}
    <slot name="overview" {pageIndex} />
{:else if pageIndex === 1}
    <slot name="stats" {pageIndex} />
{/if}
