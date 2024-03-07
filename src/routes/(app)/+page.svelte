<script lang="ts">
    import type { PageData } from "./$types";
    import { defaultMatch, type MatchType } from "$lib/types";
    import { match } from "$lib/stores/match";
    import toast from "svelte-french-toast";

    import MatchHandler from "./MatchHandler.svelte";
    import { getGuestAvatar, getGuestName } from "$lib/utils";
    import type { User } from "lucia";
    import { guestAccountSeed } from "$lib/stores/guestAccountSeed";
    import { DEFAULT_FONT_SCALE } from "$lib/config";

    export let data: PageData;

    const getUser = () => {
        if (data.user) return data.user;

        const name = getGuestName($guestAccountSeed);

        // TODO: eventually fetch this from the local storage
        return {
            id: "",
            userId: "",
            name,
            email: "",
            rating: 0,
            fontScale: DEFAULT_FONT_SCALE,
            avatar: getGuestAvatar(name),
        } satisfies User;
    };

    const user = getUser();

    const changeMatchType = (newMatchType: MatchType) => {
        if (newMatchType === "ranked" && !data.user) {
            toast.error("You need to be logged in to play ranked mode.");
            return;
        }

        match.update((m) => {
            if (m === null) {
                return { ...defaultMatch, type: newMatchType };
            }

            m.type = newMatchType;
            return m;
        });
    };
</script>

<svelte:head>
    <title>WordPractice</title>
</svelte:head>

{#if $match === null}
    {#if !data.user}
        <div>Create an account to save your progress.</div>
    {/if}
    <section class="flex gap-2">
        <button
            class="bg-emerald-500 p-3 rounded-md text-white"
            on:click={() => changeMatchType("ranked")}
        >
            Ranked Mode
        </button>
        <button
            class="bg-red-600 p-3 rounded-md text-white"
            on:click={() => changeMatchType("casual")}
        >
            Casual Mode
        </button>
        <button class="bg-blue-600 p-3 rounded-md text-white">
            Create a Private Room
        </button>
    </section>
    <section>
        <div>Latest High Scores</div>
    </section>
{:else}
    <MatchHandler sessionId={data.sessionId} {user} />
{/if}
