<script lang="ts">
    import type { PageData } from "./$types";
    import { matchType } from "$lib/stores/matchType";
    import { fly } from "svelte/transition";

    import MaterialSymbolsKeyboardArrowDownRounded from "~icons/material-symbols/keyboard-arrow-down-rounded";
    import MaterialSymbolsKeyboardArrowUpRounded from "~icons/material-symbols/keyboard-arrow-up-rounded";

    import NewUsernameModal from "./NewUsernameModal.svelte";

    export let data: PageData;

    let showDropdown = false;

    const exitActiveMatch = () => {
        matchType.set(null);
    };

    const signOut = async () => {
        const res = await fetch("/signout", { method: "POST" });

        if (res.ok) {
            // Reload the entire page
            location.reload();
            return;
        }
    };

    const toggleDropdown = () => {
        showDropdown = !showDropdown;
    };

    const closeDropdown = () => {
        showDropdown = false;
    };
</script>

<svelte:window on:click={closeDropdown} />

{#if data.user}
    <NewUsernameModal bind:user={data.user} />
{/if}

<header
    class="absolute top-0 left-0 right-0 h-[14vh] flex justify-between items-center px-20 z-50"
>
    <nav class="flex gap-12 items-center">
        <h3 class="text-3xl">WordPractice</h3>
        <a href="/" on:click={exitActiveMatch}>Play</a>
        <a href="/leaderboards">Leaderboards</a>
    </nav>

    {#if !data.user}
        <a href="/signin">Sign In</a>
    {:else}
        <div class="relative lg:ml-5 mr-2 lg:mr-0 z-50">
            <button
                class="flex items-center gap-3 sm:gap-4"
                on:click|stopPropagation={toggleDropdown}
            >
                <div class="flex items-center gap-3">
                    <img
                        src={data.user.avatar}
                        alt="{data.user.username}'s Avatar"
                        class="w-10 h-10 sm:w-11 sm:h-11 rounded-full"
                    />
                </div>
                <div>
                    {data.user.username}
                </div>
                <div class="relative text-zinc-300 mt-0.5">
                    <div
                        class="duration-200 transition-opacity {showDropdown &&
                            'opacity-0'}"
                    >
                        <MaterialSymbolsKeyboardArrowDownRounded
                            class="w-8 h-8"
                        />
                    </div>
                    <div
                        class="absolute inset-0 duration-200 transition-opacity {!showDropdown &&
                            'opacity-0'}"
                    >
                        <MaterialSymbolsKeyboardArrowUpRounded
                            class="w-8 h-8"
                        />
                    </div>
                </div>
            </button>

            {#if showDropdown}
                <div
                    class="block absolute right-0 mt-3.5 p-3.5 w-56 z-10 border rounded-lg shadow-sm bg-zinc-800 border-zinc-700 text-zinc-400"
                    transition:fly={{ y: 8, duration: 200 }}
                >
                    <a
                        href="/profile/{data.user.username}"
                        class="block px-4 py-3 hover:bg-zinc-700 hover:text-white rounded-lg transition-colors"
                        on:click|stopPropagation={toggleDropdown}
                    >
                        Profile
                    </a>
                    <a
                        href="/settings"
                        class="block px-4 py-3 hover:bg-zinc-700 hover:text-white rounded-lg transition-colors"
                        on:click|stopPropagation={toggleDropdown}
                    >
                        Settings
                    </a>
                    <button
                        class="w-full text-left px-4 py-3 hover:bg-zinc-700 hover:text-white rounded-lg transition-colors"
                        on:click|stopPropagation={signOut}
                    >
                        Log Out
                    </button>
                </div>
            {/if}
        </div>
    {/if}
</header>

<main class="mx-auto max-w-screen-xl w-full mt-[14vh]">
    <slot />
</main>
