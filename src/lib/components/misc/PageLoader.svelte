<script>
    import { onMount } from "svelte";
    import { tweened } from "svelte/motion";
    import { cubicOut } from "svelte/easing";

    import navigationState from "$lib/stores/navigationState";

    const progress = tweened(0, {
        duration: 3500,
        easing: cubicOut,
    });

    const unsubscribe = navigationState.subscribe((state) => {
        if (state === "loaded") {
            progress.set(1, { duration: 1000 });
        }
    });

    onMount(() => {
        progress.set(0.4);

        return unsubscribe;
    });
</script>

<div class="fixed inset-0 h-1">
    <div class="bg-teal-500 h-full" style="width: {$progress * 100}%" />
</div>
