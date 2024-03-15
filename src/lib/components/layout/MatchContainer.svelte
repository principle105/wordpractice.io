<script lang="ts">
    export let finished: boolean;
</script>

<div class="h-[86vh] max-w-screen-lg mx-auto flex flex-col">
    <div class="my-auto bg-zinc-100 p-8 rounded-lg">
        <slot name="racers" />

        {#if finished}
            <slot name="end-screen" />
        {:else}
            <slot name="word-display" />
            <slot name="input" />
        {/if}
    </div>
</div>
