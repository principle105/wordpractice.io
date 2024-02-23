<script lang="ts">
    import type { PageData } from "./$types";
    import { invalidateAll } from "$app/navigation";
    import { useMatchMode } from "$lib/stores/store";
    import { Toaster } from "svelte-french-toast";

    export let data: PageData;

    const match = useMatchMode();

    const exitActiveMatch = () => {
        match.set(null);
    };

    const logout = async () => {
        const res = await fetch("/logout", { method: "POST" });

        if (res.ok) {
            // Invalidating all the PageData
            await invalidateAll();
            return;
        }
    };
</script>

<Toaster />

<header class="flex justify-between px-20 py-10">
    <nav class="flex gap-12 items-center">
        <h3 class="text-3xl">Typing Website</h3>
        <a href="/" on:click={exitActiveMatch}>Play</a>
        <a href="/leaderboards">Leaderboards</a>
    </nav>

    {#if !data.user}
        <a href="/login">Login</a>
    {:else}
        <div>
            <button on:click={logout}>Logout</button>
        </div>
    {/if}
</header>

<main class="w-2/3 mx-auto">
    <slot />
</main>
