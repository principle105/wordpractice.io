<script lang="ts">
    import type { PageData } from "./$types";

    export let data: PageData;

    const userProfile = data.userProfile;
</script>

{#if userProfile}
    <section>
        <div>Username: {userProfile.id}</div>
        <div>Name: {userProfile.name}</div>
        <div>Rating: {userProfile.rating}</div>
    </section>
{:else}
    <div>User not found</div>
{/if}
