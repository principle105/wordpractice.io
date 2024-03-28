<script lang="ts">
    import { browser } from "$app/environment";

    export let isOpen = false;

    $: isOpen, updateBodyOverflow();

    // Prevents the body from scrolling when the modal is open
    const updateBodyOverflow = () => {
        if (!browser) return;

        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
    };
</script>

<div
    class="fixed inset-0 flex items-center justify-center z-[100] bg-zinc-800/20 backdrop-blur-md {!isOpen &&
        'invisible opacity-0'} transition-all duration-300 ease-in"
>
    <div
        class="bg-gray-50 border-2 border-gray-400 rounded-2xl py-9 px-6 sm:px-16 max-w-screen-sm m-4 relative"
    >
        <slot />
    </div>
</div>
