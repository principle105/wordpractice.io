<script lang="ts">
    import { page } from "$app/stores";
</script>

<div
    class="py-8 px-10 lg:px-6 text-center z-50 h-screen flex justify-center items-center"
>
    <div>
        <h1
            class="mb-2 text-8xl font-bold md:text-9xl lg:text-[12rem] text-teal-600 lg:pr-2.5"
        >
            {$page.status}
        </h1>
        {#if $page.status === 404}
            <p class="mb-2 text-xl font-bold md:text-3xl lg:text-4xl">
                It looks like you're lost…
            </p>
            <p class="mb-8 text-zinc-400 text-sm md:text-base">
                The page you are looking for does not exist
            </p>
        {:else}
            <p class="mb-8 text-xl font-bold md:text-3xl lg:text-4xl">
                {$page.error?.message}…
            </p>
        {/if}
        <a href="/" class="bg-teal-500 px-6 py-4 rounded-lg text-white">
            Back to Home Page
        </a>
    </div>
</div>
