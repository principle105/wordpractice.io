<script lang="ts">
    import { page } from "$app/stores";

    import IcBaselineDiscord from "~icons/ic/baseline-discord";
    import BiGithub from "~icons/bi/github";
    import BiGoogle from "~icons/bi/google";

    const redirectTo = $page.url.searchParams.get("redirectTo");

    $: params = redirectTo ? `?redirectTo=${redirectTo}` : "";
</script>

<svelte:head>
    <title>Login - WordPractice</title>
</svelte:head>

<main
    class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-sm text-center"
>
    <h1 class="text-3xl font-bold mb-6">Log in</h1>

    <div class="flex flex-col gap-2">
        <a
            href="/api/oauth/google{params}"
            class="py-3 w-full bg-red-500 text-white rounded-md text-lg flex gap-2 justify-center items-center"
        >
            <BiGoogle class="w-6 h-6" />
            <span>Google</span>
        </a>
        <a
            href="/api/oauth/github{params}"
            class="py-3 w-full bg-zinc-800 text-white rounded-md text-lg flex gap-2 justify-center items-center"
        >
            <BiGithub class="w-6 h-6" />
            <span>Github</span>
        </a>
        <a
            href="/api/oauth/discord{params}"
            class="py-3 w-full bg-indigo-500 text-white rounded-md text-lg flex gap-2 justify-center items-center"
        >
            <IcBaselineDiscord class="w-6 h-6" />
            <span>Discord</span>
        </a>
    </div>
</main>
