<script lang="ts">
    import type { PageData } from "./$types";
    import { defaultMatch } from "$lib/constants";
    import type { MatchType } from "$lib/types";
    import { match } from "$lib/stores/match";
    import toast from "svelte-french-toast";

    import MatchHandler from "./MatchHandler.svelte";
    import { getGuestAvatar, getGuestName } from "$lib/utils";
    import type { User } from "lucia";
    import { guestAccountSeed } from "$lib/stores/guestAccountSeed";
    import { DEFAULT_FONT_SCALE } from "$lib/config";

    import FaRegKeyboard from "svelte-icons/fa/FaRegKeyboard.svelte";

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

    const createNewPrivateRoom = () => {
        alert("Not implemented yet");
    };
</script>

<svelte:head>
    <title>WordPractice</title>
</svelte:head>

{#if $match === null}
    <section class="pt-2">
        <div class="grid grid-cols-1 gap-6 mx-auto sm:grid-cols-3">
            <button
                class="flex flex-col gap-2 items-center justify-center px-16 py-6 border border-gray-200 rounded-lg bg-gray-50"
                on:click={() => changeMatchType("ranked")}
            >
                <div class="text-center">
                    <h3 class="font-bold text-xl mb-1">Ranked Mode</h3>
                    <p class="text-sm text-gray-500">
                        Lorem ipsum dolor sit amet consectetur adipisicing elit.
                    </p>
                </div>
                <div class="w-20 h-20 text-gray-500">
                    <FaRegKeyboard />
                </div>
            </button>
            <button
                class="flex flex-col gap-2 items-center justify-center px-16 py-6 border border-gray-200 rounded-lg bg-gray-50"
                on:click={() => changeMatchType("casual")}
            >
                <div class="text-center">
                    <h3 class="font-bold text-xl mb-1">Casual Mode</h3>
                    <p class="text-sm text-gray-500">
                        Lorem ipsum dolor sit amet consectetur adipisicing elit.
                    </p>
                </div>
                <div class="w-20 h-20 text-gray-500">
                    <FaRegKeyboard />
                </div>
            </button>
            <button
                class="flex flex-col gap-2 items-center justify-center px-16 py-6 border border-gray-200 rounded-lg bg-gray-50"
                on:click={createNewPrivateRoom}
            >
                <div class="text-center">
                    <h3 class="font-bold text-xl mb-1">
                        Create a Private Room
                    </h3>
                    <p class="text-sm text-gray-500">
                        Lorem ipsum dolor sit amet consectetur adipisicing elit.
                    </p>
                </div>
                <div class="w-20 h-20 text-gray-500">
                    <FaRegKeyboard />
                </div>
            </button>
        </div>
    </section>

    <section class="mt-10">
        <h3 class="text-center font-bold text-2xl">Latest High Scores</h3>
    </section>
{:else}
    <MatchHandler sessionId={data.sessionId} {user} />
{/if}
