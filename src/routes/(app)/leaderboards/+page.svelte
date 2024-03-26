<script lang="ts">
    import type { PageData } from "./$types";

    export let data: PageData;
</script>

<svelte:head>
    <title>Leaderboard - WordPractice</title>
</svelte:head>

<section>
    {#each data.leaderboard as player, i}
        <a class="flex gap-3" href="/profile/{player.id}">
            <div>{i + 1}.</div>
            <div>{player.id}</div>
            <div>{player.rating}</div>
        </a>
    {/each}
    <div>-------------------</div>
    {#if data.userPosition !== null && data.user !== null}
        <a class="flex gap-3" href="/profile/{data.user.id}">
            <div>
                {data.userPosition}.
            </div>
            <div>
                {data.user.id}
            </div>
            <div>
                {data.user.rating}
            </div>
        </a>
    {/if}
</section>
