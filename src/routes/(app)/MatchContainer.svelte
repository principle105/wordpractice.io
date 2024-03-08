<script lang="ts">
    export let finished: boolean;
</script>

<div class="bg-orange-300 h-[88vh] max-w-screen-lg mx-auto flex flex-col">
    <div class="my-auto bg-red-400">
        <slot name="racers" />

        {#if finished}
            <slot name="end-screen" />
        {:else}
            <slot name="word-display" />
            <slot name="input" />
        {/if}
    </div>
</div>
