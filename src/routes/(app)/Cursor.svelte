<script lang="ts">
    import type { Replay } from "$lib/types";

    export let fontSize: number;
    export let replay: Replay;
    export let quote: string[];
    export let correct: string;
    export let wrapperElement: HTMLElement | null;
    export let name: string | null = null;

    let topPos = 0;
    let leftPos = 0;

    // TODO: use the previous value when recalculating
    const updatePositioning = () => {
        if (wrapperElement === null) return;

        let newLeftPos = 0;
        let newTopPos = 0;

        const maxWidth = wrapperElement.offsetWidth;
        const charWidthIncrease = fontSize * 0.6;
        const charHeightIncrease = fontSize * 1.5;

        let newLine = false;

        correct.split(" ").forEach((word, i) => {
            if (i !== 0 && !newLine) {
                newLeftPos += charWidthIncrease;
            }

            if (newLine) {
                newLeftPos = 0;
                newTopPos += charHeightIncrease;
                newLine = false;
            }

            const wordWidth = word.length * charWidthIncrease;

            if (quote[i] === word && i + 1 < quote.length) {
                const nextWordWidth =
                    (quote[i + 1].length + 1) * charWidthIncrease;

                if (newLeftPos + wordWidth + nextWordWidth >= maxWidth) {
                    newLine = true;
                }
            }

            newLeftPos += wordWidth;
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
