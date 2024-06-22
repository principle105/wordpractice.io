<script lang="ts">
    import { onDestroy, onMount } from "svelte";

    import { matchType } from "$lib/stores/matchType";

    export let minSearchRating: number;
    export let maxSearchRating: number;

    let startSearchTime = 0;
    let interval: ReturnType<typeof setInterval>;

    onMount(() => {
        interval = setInterval(() => {
            startSearchTime++;
        }, 1000);
    });

    onDestroy(() => {
        clearInterval(interval);
    });

    $: timeDisplay = `${String(Math.floor(startSearchTime / 60)).padStart(
        2,
        "0"
    )}:${String(startSearchTime % 60).padStart(2, "0")}`;
</script>

<div class="max-w-screen-lg mx-auto h-full flex flex-col items-center">
    <div>Tip: Lorem ipsum dolor sit amet consectetur adipisicing elit.</div>

    <div>
        Looking for an opponent ({minSearchRating} - {maxSearchRating})
    </div>

    <div>
        Time: {timeDisplay}
    </div>

    <button
        class="bg-red-500 p-3 rounded-md text-white"
        on:click={() => {
            matchType.set(null);
        }}
    >
        Cancel
    </button>
</div>
