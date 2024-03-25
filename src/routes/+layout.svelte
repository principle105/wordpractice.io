<script lang="ts">
    import { page } from "$app/stores";
    import { getFlash } from "sveltekit-flash-message";
    import toast, { Toaster } from "svelte-french-toast";

    import "./global.css";

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
