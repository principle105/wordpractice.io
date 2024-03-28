<script lang="ts">
    import type { PageData } from "./$types";

    export let data: PageData;
</script>

<svelte:head>
    <title>Leaderboard - WordPractice</title>
</svelte:head>

<section>
    {#each data.leaderboard as player, i}
        <a class="flex gap-3" href="/profile/{player.username}">
            <div>{i + 1}.</div>
            <div>{player.username}</div>
            <div>{player.rating}</div>
        </a>
    {/each}
    {#if data.userPosition !== null && data.user !== null}
        <div>-------------------</div>
        <a class="flex gap-3" href="/profile/{data.user.username}">
            <div>
                {data.userPosition}.
            </div>
            <div>
                {data.user.username}
            </div>
            <div>
                {data.user.rating}
            </div>
        </a>
    {/if}
</section>
