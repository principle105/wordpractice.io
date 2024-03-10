<script lang="ts">
    import type { PageData } from "./$types";

    export let data: PageData;
</script>

<svelte:head>
    <title>Leaderboard - WordPractice</title>
</svelte:head>

<section>
    {#each data.leaderboard as player, i}
        <div class="flex gap-3">
            <p>{i + 1}.</p>
            <p>{player.name}</p>
            <p>{player.rating}</p>
        </div>
    {/each}
    {#if data.userPosition}
        <p>Your position: {data.userPosition}</p>
    {/if}
</section>
