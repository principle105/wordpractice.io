<script lang="ts">
    import { onMount } from "svelte";

    import { matchType } from "$lib/stores/matchType";
    import { secondsToMinutesAndSeconds } from "$lib/utils/conversions";

    export let minSearchRating: number;
    export let maxSearchRating: number;

    let startSearchTime = 0;
    let interval: ReturnType<typeof setInterval>;

    onMount(() => {
        interval = setInterval(() => {
            startSearchTime++;
        }, 1000);

        return () => clearInterval(interval);
    });

    $: timeDisplay = secondsToMinutesAndSeconds(startSearchTime);
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
        on:click={() => matchType.set(null)}
    >
        Cancel
    </button>
</div>
