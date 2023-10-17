<script lang="ts">
    import type { Replay } from "$lib/types";

    export let fontSize: number;
    export let replay: Replay;
    export let correct: string;
    export let wrapperElement: HTMLElement | null;
    export let name: string | null = null;

    let topPos = 0;
    let leftPos = 0;

    const updatePositioning = () => {
        if (wrapperElement === null) return;

        let newLeftPos = 0;
        let newTopPos = 0;

        const maxWidth = wrapperElement.offsetWidth;
        const charWidthIncrease = fontSize * 0.6;
        const charHeightIncrease = fontSize * 1.5;

        correct.split(" ").forEach((word, i) => {
            if (i !== 0) {
                newLeftPos += charWidthIncrease;
            }

            const wordLength = word.length * charWidthIncrease;

            if (newLeftPos + wordLength >= maxWidth) {
                newLeftPos = 0;
                newTopPos += charHeightIncrease;
            }
            newLeftPos += wordLength;
        });

        leftPos = newLeftPos;
        topPos = newTopPos;
    };

    $: replay, updatePositioning();
</script>

<svelte:window on:resize={updatePositioning} />

<div
    class="absolute"
    style="top: {topPos +
        fontSize *
            0.1}px; left: {leftPos}px; transition: left 0.06s ease-in-out;"
>
    <div
        class="bg-orange-400 rounded-full"
        style="height: {fontSize * 1.2}px; width: {fontSize * 0.1}px;"
    />
    {#if name !== null}
        <div
            class="bg-zinc-300 px-1"
            style="font-size: {fontSize * 0.35}px; padding: {fontSize *
                0.025}px {fontSize * 0.15}px;"
        >
            {name}
        </div>
    {/if}
</div>
