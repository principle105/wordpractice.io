<script lang="ts">
    import { getFlash } from "sveltekit-flash-message";
    import { page } from "$app/stores";

    import "./global.css";
    import toast, { Toaster } from "svelte-french-toast";

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

<Toaster />

<slot />
