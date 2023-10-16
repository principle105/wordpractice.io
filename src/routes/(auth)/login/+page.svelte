<script lang="ts">
    import FaGithub from "svelte-icons/fa/FaGithub.svelte";
    import FaDiscord from "svelte-icons/fa/FaDiscord.svelte";
</script>

<main
    class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-sm text-center"
>
    <h1 class="text-3xl font-bold mb-6">Log in</h1>

    <div class="flex flex-col gap-2">
        <a
            href="/api/oauth/github"
            class="py-3 w-full bg-zinc-800 text-white rounded-md text-lg flex gap-2 justify-center items-center"
        >
            <div class="w-6 h-6">
                <FaGithub />
            </div>
            <span>Github</span>
        </a>
        <a
            href="/api/oauth/discord"
            class="py-3 w-full bg-indigo-500 text-white rounded-md text-lg flex gap-2 justify-center items-center"
        >
            <div class="w-6 h-6">
                <FaDiscord />
            </div>
            <span>Discord</span>
        </a>
    </div>
</main>
