<script lang="ts">
    import { page } from "$app/stores";
    import { beforeNavigate, afterNavigate } from "$app/navigation";
    import { getFlash } from "sveltekit-flash-message";
    import toast, { Toaster } from "svelte-french-toast";
    import { fade } from "svelte/transition";

    import navigationState from "$lib/stores/navigationState";
    import PageLoader from "$lib/components/misc/PageLoader.svelte";

    import "./global.css";

    beforeNavigate(() => {
        navigationState.set("loading");
    });

    afterNavigate(() => {
        navigationState.set("loaded");
    });

    const flash = getFlash(page);

    $: if ($flash) {
        switch ($flash.type) {
            case "success":
                toast.success($flash.message);
                break;
            case "error":
                toast.error($flash.message);
                break;
        }
    }
</script>

{#if $navigationState === "loading"}
    <div out:fade={{ delay: 500 }}>
        <PageLoader />
    </div>
{/if}

<Toaster />

<slot />
