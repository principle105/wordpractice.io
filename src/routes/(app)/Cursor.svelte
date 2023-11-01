<script lang="ts">
    import type { Replay } from "$lib/types";
    import { onMount } from "svelte";

    export let fontSize: number;
    export let replay: Replay;
    export let quote: string[];
    export let correct: string;
    export let wrapperElement: HTMLElement | null;
    export let name: string | null = null;

    // TODO: add this to the confrig file
    const CURSOR_BLINKING_INTERVAL = 1 * 1000;

    let topPos = 0;
    let leftPos = 0;

    let lastWordPositions: [number, number] = [0, 0];
    let lastWordIndex: number = 0;

    let date: number = Date.now();

    onMount(() => {
        const interval = setInterval(() => {
            date = Date.now();
        }, 250);
        return () => clearInterval(interval);
    });

    const updatePositioning = () => {
        if (wrapperElement === null) return;

        let newLeftPos = 0;
        let newTopPos = 0;

        const maxWidth = wrapperElement.offsetWidth;
        const charWidthIncrease = fontSize * 0.6;
        const charHeightIncrease = fontSize * 1.5;

        const words = correct.split(" ");
        let word: string;
        const currentIndex = words.length - 1;

        const loadedFromLastWord =
            lastWordPositions[0] !== 0 || lastWordPositions[1] !== 0;

        if (loadedFromLastWord) {
            newLeftPos = lastWordPositions[0];
            newTopPos = lastWordPositions[1];

            word = words[lastWordIndex];
        } else {
            word = words[0];
        }

        if (word === "" && newLeftPos === 0) {
            return;
        }

        if (loadedFromLastWord && lastWordPositions[0] !== 0) {
            newLeftPos += charWidthIncrease;
        }

        const wordWidth = word.length * charWidthIncrease;

        let newLine: boolean = false;

        if (quote[currentIndex - 1] === word && currentIndex < quote.length) {
            const nextWordWidth =
                (quote[currentIndex].length + 1) * charWidthIncrease;

            if (newLeftPos + wordWidth + nextWordWidth >= maxWidth) {
                newLine = true;
            }
        }

        if (newLine) {
            newLeftPos = 0;
            newTopPos += charHeightIncrease;
        } else {
            newLeftPos += wordWidth;
        }

        if (lastWordIndex !== currentIndex) {
            lastWordIndex = currentIndex;
            lastWordPositions = [newLeftPos, newTopPos];
        }

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
            0.1}px; left: {leftPos}px; transition: left 0.075s ease-in-out;"
    id={replay.length === 0 ||
    replay[replay.length - 1].timestamp + CURSOR_BLINKING_INTERVAL <= date
        ? "cursor-blinking"
        : ""}
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

<style>
    @keyframes blink {
        0% {
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    #cursor-blinking {
        animation: blink 1s infinite;
    }
</style>
