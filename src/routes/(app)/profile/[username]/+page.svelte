<script lang="ts">
    import type { PageData } from "./$types";

    export let data: PageData;

    const userProfile = data.userProfile;
</script>

<svelte:head>
    {#if userProfile}
        <title>{userProfile.username}'s Profile - WordPractice</title>
    {:else}
        <title>User Not Found - WordPractice</title>
    {/if}
</svelte:head>

{#if userProfile}
    <section>
        <div>Username: {userProfile.id}</div>
        <div>Name: {userProfile.username}</div>
        <div>Rating: {userProfile.rating}</div>
    </section>
{:else}
    <div>User not found</div>
{/if}
