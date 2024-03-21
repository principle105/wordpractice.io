<script lang="ts">
    import { onMount } from "svelte";

    import { CARET_BLINKING_INTERVAL, DEFAULT_LINES_SHOWN } from "$lib/config";
    import type { Replay } from "$lib/types";
    import { getCaretData } from "$lib/utils";

    export let fontSize: number;
    export let timingOffset: number;
    export let replay: Replay;
    export let quote: string[];
    export let completedWords: string;
    export let wrapperElement: HTMLElement | null;
    export let name: string | null = null;
    export let topPos = 0;

    let leftPos = 0;
    let highlightWidth = 0;

    let lastWordPositions: [number, number] = [0, 0];
    let lastWordIndex = 0;

    let currentTime: number = Date.now();

    onMount(() => {
        const interval = setInterval(() => {
            currentTime = Date.now();
        }, 250);
        return () => clearInterval(interval);
    });

    // TODO: Fix correcting a word in the middle
    const updatePositioning = () => {
        if (wrapperElement === null) return;

        const maxWidth = wrapperElement.offsetWidth;
        const charWidthIncrease = fontSize * 0.6;
        const charHeightIncrease = fontSize * 1.5;

        const words = completedWords.split(" ");

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

        // Caret Movement
        if (caretMovement !== null) {
            newLeftPos += caretMovement.start * charWidthIncrease;

            if (caretMovement.start !== caretMovement.end) {
                highlightWidth =
                    (caretMovement.end - caretMovement.start) *
                    charWidthIncrease;
            } else {
                highlightWidth = 0;
            }

            leftPos = newLeftPos;
            topPos = newTopPos;
            return;
        }

        const wordWidth = word.length * charWidthIncrease;

        let newLine = false;

        if (words[currentIndex] === "" && currentIndex !== 0) {
            const nextWordWidth =
                quote[currentIndex].length * charWidthIncrease;
            const cursorSize = fontSize * 0.1;

            if (
                newLeftPos +
                    wordWidth +
                    charWidthIncrease +
                    nextWordWidth +
                    cursorSize >=
                maxWidth
            ) {
                newLine = true;
            }
            // Checking if a new word is being added instead of a delete
            else if (lastWordIndex !== currentIndex) {
                // Handling spaces
                newLeftPos += charWidthIncrease;
            }
        }

        if (newLine) {
            newLeftPos = 0;
            newTopPos += charHeightIncrease;
        } else {
            newLeftPos += wordWidth;
        }

        if (lastWordIndex !== currentIndex || newLine) {
            lastWordIndex = currentIndex;
            lastWordPositions = [newLeftPos, newTopPos];
        }

        leftPos = newLeftPos;
        topPos = newTopPos;
    };

    $: replay, updatePositioning();

    const getTopPos = (topPos: number) => {
        if (name !== null) {
            return topPos;
        }

        if (wrapperElement === null) return topPos;

        const wrappedThreshold =
            wrapperElement.offsetHeight - DEFAULT_LINES_SHOWN * fontSize * 1.5;

        if (wrapperElement !== null && wrappedThreshold < topPos) {
            return topPos - wrappedThreshold;
        }

        return 0;
    };
</script>

<svelte:window on:resize={updatePositioning} />

<div
    class="absolute"
    style="top: {getTopPos(topPos) +
        fontSize * 0.1}px; left: {leftPos}px; transition: left 0.06s linear"
>
    <div class="flex">
        <div
            class="bg-zinc-500 rounded-full"
            style="height: {fontSize * 1.25}px; width: {fontSize * 0.1}px;"
            id={replay.length === 0 ||
            replay[replay.length - 1].timestamp +
                timingOffset +
                CARET_BLINKING_INTERVAL <=
                currentTime
                ? "caret-blinking"
                : ""}
        />
        <div
            class="bg-blue-500/30"
            style="height: {fontSize * 1.25}px; width: {highlightWidth}px;"
        />
    </div>
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
