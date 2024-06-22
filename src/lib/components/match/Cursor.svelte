<script lang="ts">
    import { onMount } from "svelte";

    import {
        CARET_BLINKING_INTERVAL,
        DEFAULT_MAX_LINES_SHOWN,
    } from "$lib/config";
    import type { Replay } from "$lib/types";
    import {
        convertReplayToWords,
        getCaretData,
        getCompletedAndIncorrectWords,
    } from "$lib/utils/textProcessing";

    export let fontSize: number;
    export let timingOffset: number;
    export let replay: Replay;
    export let text: string[];
    export let wrapperElement: HTMLElement | null;
    export let username: string | null = null;
    export let clientUserLastIndex: number | null = null;

    export let topPos = 0;
    export let lastWordIndex = 0;

    let leftPos = 0;
    let highlightWidth = 0;

    let lastWordPositions: [number, number] = [0, 0];

    let currentTime: number = Date.now();

    onMount(() => {
        const interval = setInterval(() => {
            currentTime = Date.now();
        }, 250);

        return () => clearInterval(interval);
    });

    const cursorSize = fontSize * 0.1;

    // TODO: Fix correcting a word in the middle
    const updatePositioning = (replay: Replay) => {
        if (wrapperElement === null) return;

        const maxWidth = wrapperElement.offsetWidth;
        const charWidthIncrease = fontSize * 0.6;
        const charHeightIncrease = fontSize * 1.5;

        const wordsTyped = convertReplayToWords(replay, text);
        const { completedWords } = getCompletedAndIncorrectWords(
            wordsTyped,
            text
        );

        const words = completedWords.split(" ");

        let typedWord: string;

        const currentIndex = words.length - 1;

        const loadedFromLastWord =
            lastWordPositions[0] !== 0 || lastWordPositions[1] !== 0;

        let newLeftPos = 0;
        let newTopPos = 0;

        if (loadedFromLastWord) {
            newLeftPos = lastWordPositions[0];
            newTopPos = lastWordPositions[1];

            typedWord = words[lastWordIndex];
        } else {
            typedWord = words[0];
        }

        if (typedWord === undefined) return;

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
        } else {
            highlightWidth = 0;
        }

        const typedWordWidth = typedWord.length * charWidthIncrease;

        let createNewLine = false;

        if (
            words[currentIndex] === "" &&
            currentIndex !== 0 &&
            lastWordIndex !== currentIndex
        ) {
            const nextWordWidth = text[currentIndex].length * charWidthIncrease;

            // If the word with a space is too long to fit the next word on the same line
            if (
                newLeftPos +
                    typedWordWidth +
                    nextWordWidth +
                    charWidthIncrease +
                    cursorSize >=
                maxWidth
            ) {
                createNewLine = true;
            }
            // Checking if a new word is being added instead of a delete
            else if (lastWordIndex !== currentIndex) {
                // Handling spaces
                newLeftPos += charWidthIncrease;
            }
        }

        if (createNewLine) {
            newLeftPos = 0;
            newTopPos += charHeightIncrease;
        } else {
            newLeftPos += typedWordWidth;
        }

        if (lastWordIndex !== currentIndex || createNewLine) {
            lastWordIndex = currentIndex;
            lastWordPositions = [newLeftPos, newTopPos];
        }

        leftPos = newLeftPos;
        topPos = newTopPos;
    };

    $: replay, updatePositioning(replay);

    const getTopPos = (topPos: number) => {
        if (username !== null) {
            return topPos;
        }

        if (wrapperElement === null) return topPos;

        const wrappedThreshold =
            wrapperElement.offsetHeight -
            DEFAULT_MAX_LINES_SHOWN * fontSize * 1.5;

        if (wrappedThreshold <= 0) {
            return topPos;
        }

        if (wrappedThreshold < topPos) {
            return topPos - wrappedThreshold;
        }

        return 0;
    };

    const handleResize = () => {
        lastWordPositions = [0, 0];
        lastWordIndex = 0;
        leftPos = 0;
        topPos = 0;

        for (let i = 0; i < replay.length; i++) {
            updatePositioning(replay.slice(0, i + 1));
        }
    };

    $: wrapperElement, handleResize();

    $: isCaretBlinking =
        replay.length === 0 ||
        replay[replay.length - 1].timestamp +
            timingOffset +
            CARET_BLINKING_INTERVAL <=
            currentTime;

    // check if the opponent is 3 words away from the client user
    $: isCloseToClient =
        clientUserLastIndex === null ||
        Math.abs(lastWordIndex - clientUserLastIndex) <= 4;
</script>

<svelte:window on:resize={handleResize} />

<!-- Source of Cubic Bezier: https://stackoverflow.com/questions/9245030/looking-for-a-swing-like-easing-expressible-both-with-jquery-and-css3 -->
<div
    class="absolute {isCloseToClient
        ? 'opacity-100 z-50'
        : 'opacity-30 -z-50'} transition-all duration-1000"
    style="top: {getTopPos(topPos) +
        fontSize *
            0.125}px; left: {leftPos}px; transition: left 100ms cubic-bezier(.02, .01, .47, 1);"
>
    <div class="flex relative">
        <div
            class="rounded-full {username !== null
                ? 'bg-zinc-400'
                : 'bg-teal-600'}"
            style="height: {fontSize * 1.2}px; width: {cursorSize}px;"
            id={isCaretBlinking ? "caret-blinking" : ""}
        />
        <div
            class="bg-blue-500/30"
            style="height: {fontSize *
                1.25}px; width: {highlightWidth}px; transition: width 100ms cubic-bezier(.02, .01, .47, 1);"
        />
        {#if username !== null}
            <div
                class="bg-zinc-200 px-px absolute top-full right-0 font-mono rounded-md"
                style="font-size: {fontSize * 0.35}px; padding: {fontSize *
                    0.025}px {fontSize * 0.15}px;"
            >
                {username}
            </div>
        {/if}
    </div>
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
