<script lang="ts">
    import toast from "svelte-french-toast";
    import type { PageData } from "./$types";
    import type { User } from "@prisma/client";

    import { guestAccountSeed } from "$lib/stores/guestAccountSeed";
    import { DEFAULT_FONT_SCALE } from "$lib/config";
    import { getGuestAvatar, getGuestUsername } from "$lib/utils/random";
    import type { MatchType } from "$lib/types";
    import { matchType } from "$lib/stores/matchType";

    import MatchHandler from "./MatchHandler.svelte";

    import Fa6RegularKeyboard from "~icons/fa6-regular/keyboard";
    import NimbusStats from "~icons/nimbus/stats";

    export let data: PageData;

    const getUser = () => {
        if (data.user) return data.user;

        const username = getGuestUsername($guestAccountSeed);

        return {
            id: "",
            username,
            email: "",
            rating: 0,
            fontScale: DEFAULT_FONT_SCALE,
            avatar: getGuestAvatar(username),
            provider: "",
            pickedInitalUsername: true,
        } satisfies User;
    };

    const user = getUser();

    const changeMatchType = (newMatchType: MatchType) => {
        if (newMatchType === "ranked" && !data.user) {
            toast.error("You need to be signed in to play ranked mode.");
            return;
        }

        matchType.set(newMatchType);
    };

    const createNewPrivateRoom = () => {
        alert("Not implemented yet");
    };
</script>

<svelte:head>
    <title>WordPractice</title>
</svelte:head>

{#if $matchType === null}
    <section class="pt-2">
        <div class="grid grid-cols-1 gap-6 mx-auto sm:grid-cols-3 grow">
            <button
                class="flex flex-col gap-2 items-center justify-center px-12 py-6 border border-gray-200 rounded-lg bg-gray-50"
                on:click={() => changeMatchType("ranked")}
            >
                <div class="text-center">
                    <h3 class="font-bold text-2xl mb-1">Ranked Mode</h3>
                    <p class="text-sm text-gray-500">
                        Lorem ipsum dolor sit amet consectetur adipisicing elit.
                    </p>
                </div>
                <Fa6RegularKeyboard class="w-16 h-16 text-gray-500" />
            </button>
            <button
                class="flex flex-col gap-2 items-center justify-center px-12 py-6 border border-gray-200 rounded-lg bg-gray-50"
                on:click={() => changeMatchType("casual")}
            >
                <div class="text-center">
                    <h3 class="font-bold text-2xl mb-1">Casual Mode</h3>
                    <p class="text-sm text-gray-500">
                        Lorem ipsum dolor sit amet consectetur adipisicing elit.
                    </p>
                </div>

                <Fa6RegularKeyboard class="w-16 h-16 text-gray-500" />
            </button>
            <button
                class="flex flex-col gap-2 items-center justify-center px-12 py-6 border border-gray-200 rounded-lg bg-gray-50"
                on:click={createNewPrivateRoom}
            >
                <div class="text-center">
                    <h3 class="font-bold text-2xl mb-1">
                        Create a Private Room
                    </h3>
                    <p class="text-sm text-gray-500">
                        Lorem ipsum dolor sit amet consectetur adipisicing elit.
                    </p>
                </div>
                <Fa6RegularKeyboard class="w-16 h-16 text-gray-500" />
            </button>
        </div>
    </section>

    <div class="flex mt-10">
        <section class="w-full">
            <h3 class="text-center font-bold text-2xl">Latest High Scores</h3>
        </section>
        <section
            class="rounded-lg border border-gray-200 bg-gray-50 w-full max-w-lg p-12"
        >
            <div class="flex flex-col items-center justify-center gap-1 mb-6">
                <NimbusStats class="h-10 w-10 mb-2" />
                <h3 class="text-2xl font-semibold">
                    Typing Stats (Last 10 Tests)
                </h3>
            </div>
            <div class="grid grid-cols-3 items-center gap-4">
                <div class="flex flex-col gap-0.5">
                    <div class="text-sm font-medium text-zinc-600">
                        Average WPM
                    </div>
                    <div class="text-2xl font-bold">65</div>
                    <div class="text-sm font-bold text-green-500">+10</div>
                </div>
                <div class="flex flex-col gap-0.5">
                    <div class="text-sm font-medium text-zinc-600">
                        Average Accuracy
                    </div>
                    <div class="text-2xl font-bold">98%</div>
                    <div class="text-sm font-bold text-red-500">-2%</div>
                </div>
                <div class="flex flex-col gap-0.5">
                    <div class="text-sm font-medium text-zinc-600">Rating</div>
                    <div class="text-2xl font-bold">{user.rating}</div>
                    <div class="text-sm font-bold text-green-500">+10</div>
                </div>
            </div>
        </section>
    </div>
{:else}
    <MatchHandler sessionId={data.sessionId} {user} />
{/if}
