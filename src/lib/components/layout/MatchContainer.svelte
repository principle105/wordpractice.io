<script lang="ts">
    import type { BasicRoomInfo, BasicRoomInfoStarted } from "$lib/types";

    export let finished: boolean;
    export let started: boolean;
    export let roomInfo: BasicRoomInfo | null;

    $: startedRoomInfo = roomInfo as BasicRoomInfoStarted;
</script>

{#key started}
    <div class="h-full mx-auto flex flex-col">
        {#if roomInfo === null}
            <slot name="loading" />
        {:else if roomInfo.startTime === null || roomInfo.quote === null}
            {#if !finished}
                <slot name="before-start" />
            {/if}
        {:else}
            <div class="my-auto py-8 px-20">
                <slot name="racers" {startedRoomInfo} />

                {#if finished}
                    <slot name="end-screen" />
                {:else}
                    <slot name="word-display" {startedRoomInfo} />
                    <slot name="input" {startedRoomInfo} />
                {/if}
            </div>
        {/if}
    </div>
{/key}
