<script lang="ts">
    import type { PageData } from "./$types";
    import { match } from "$lib/stores/match";
    import { Toaster } from "svelte-french-toast";

    export let data: PageData;

    const exitActiveMatch = () => {
        match.set(null);
    };

    const logout = async () => {
        const res = await fetch("/logout", { method: "POST" });

        if (res.ok) {
            // Reload the entire page
            location.reload();
            return;
        }
    };
</script>

<Toaster />

<header
    class="absolute top-0 left-0 right-0 h-[12vh] flex justify-between items-center px-20 bg-purple-400 z-50"
>
    <nav class="flex gap-12 items-center">
        <h3 class="text-3xl">Typing Website</h3>
        <a href="/" on:click={exitActiveMatch}>Play</a>
        <a href="/leaderboards">Leaderboards</a>
    </nav>

    {#if !data.user}
        <a href="/login">Login</a>
    {:else}
        <div class="flex items-center gap-2">
            <img
                src={data.user.avatar}
                alt="{data.user.name}'s Avatar"
                class="h-12 w-12 object-cover rounded-full"
            />

            <div>
                <button on:click={logout}>Logout</button>
            </div>
        </div>
    {/if}
</header>

<main class="mx-auto max-w-screen-xl w-full bg-green-400 mt-[12vh]">
    <slot />
</main>
