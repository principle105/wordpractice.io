<script lang="ts">
    import type { BasicRoomInfo, BasicRoomInfoStarted } from "$lib/types";

    export let finished: boolean;
    export let started: boolean;
    export let roomInfo: BasicRoomInfo | null;

    $: startedRoomInfo = roomInfo as BasicRoomInfoStarted;
</script>

{#key started}
    <div class="h-[86vh] max-w-screen-lg mx-auto flex flex-col">
        {#if roomInfo === null}
            <slot name="loading" />
        {:else if roomInfo.startTime === null || roomInfo.quote === null}
            <slot name="waiting" />
        {:else}
            <div class="my-auto bg-zinc-100 p-8 rounded-lg">
                <slot name="racers" {startedRoomInfo} />

                {#if finished}
                    <slot name="end-screen" {startedRoomInfo} />
                {:else}
                    <slot name="word-display" {startedRoomInfo} />
                    <slot name="input" {startedRoomInfo} />
                {/if}
            </div>
        {/if}
    </div>
{/key}
