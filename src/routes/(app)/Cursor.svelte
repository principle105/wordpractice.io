<script lang="ts">
    import { CARET_BLINKING_INTERVAL } from "$lib/config";
    import type { Replay } from "$lib/types";
    import { getCaretData } from "$lib/utils";
    import { onMount } from "svelte";

    export let fontSize: number;
    export let timingOffset: number;
    export let replay: Replay;
    export let quote: string[];
    export let correctInput: string;
    export let wrapperElement: HTMLElement | null;
    export let name: string | null = null;
    export let topPos: number = 0;

    let leftPos = 0;

    let lastWordPositions: [number, number] = [0, 0];
    let lastWordIndex: number = 0;

    let currentTime: number = Date.now();

    onMount(() => {
        const interval = setInterval(() => {
            currentTime = Date.now();
        }, 250);
        return () => clearInterval(interval);
    });

    // TODO: correct positioning on delete last word
    const updatePositioning = () => {
        if (wrapperElement === null) return;

        const maxWidth = wrapperElement.offsetWidth;
        const charWidthIncrease = fontSize * 0.6;
        const charHeightIncrease = fontSize * 1.5;

        const words = correctInput.split(" ");

        let word: string;
        const currentIndex = words.length - 1;

        const loadedFromLastWord =
            lastWordPositions[0] !== 0 || lastWordPositions[1] !== 0;

        let newLeftPos = 0;
        let newTopPos = 0;

        if (loadedFromLastWord) {
            newLeftPos = lastWordPositions[0];
            newTopPos = lastWordPositions[1];

            word = words[lastWordIndex];
        } else {
            word = words[0];
        }

        const caretMovement = getCaretData(replay);

        if (caretMovement !== null) {
            newLeftPos += (caretMovement.start + 1) * charWidthIncrease;
            leftPos = newLeftPos;
            topPos = newTopPos;
            return;
        }

        // If nothing has been typed yet
        if (word === "" && newLeftPos === 0) {
            leftPos = newLeftPos;
            topPos = newTopPos;
            return;
        }

        if (loadedFromLastWord && lastWordPositions[0] !== 0) {
            newLeftPos += charWidthIncrease;
        }

        const wordWidth = word.length * charWidthIncrease;

        let newLine = false;

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
    class="absolute ease-linear"
    style="top: {(name === null ? 0 : topPos) +
        fontSize *
            0.1}px; left: {leftPos}px; transition: left 0.085s, top 0.001s;"
    id={replay.length === 0 ||
    replay[replay.length - 1].timestamp +
        timingOffset +
        CARET_BLINKING_INTERVAL <=
        currentTime
        ? "caret-blinking"
        : ""}
>
    <div
        class="bg-orange-400 rounded-full"
        style="height: {fontSize * 1.3}px; width: {fontSize * 0.1}px;"
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

    #caret-blinking {
        animation: blink 1s infinite;
    }
</style>
