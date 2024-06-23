<script lang="ts">
    import { onMount } from "svelte";
    import type { EventHandler } from "svelte/elements";

    import type {
        CaretMovement,
        Character,
        Delete,
        Replay,
        BasicRoomInfoStarted,
    } from "$lib/types";
    import {
        convertReplayToWords,
        findRemovedSlice,
    } from "$lib/utils/textProcessing";

    export let startedRoomInfo: BasicRoomInfoStarted;
    export let replay: Replay;
    export let started: boolean;

    let currentWordIndex = 0;
    let wordInput = "";

    let inputElement: HTMLInputElement | null = null;

    $: started, inputElement, focusInputWhenRaceStarts();

    onMount(() => {
        replay = replay;
    });

    const focusInputWhenRaceStarts = () => {
        if (!started) return;

        inputElement?.focus();
    };

    const handleInput: EventHandler<Event, HTMLInputElement> = (e) => {
        if (e.target === null) return;

        const now = Date.now();

        const newChar = (e as any as InputEvent).data;

        const wordsTyped = convertReplayToWords(
            replay,
            startedRoomInfo.quote.text
        );

        let removedSlice = findRemovedSlice(
            wordsTyped[wordsTyped.length - 1],
            wordInput,
            newChar,
            inputElement?.selectionStart ?? 0
        );

        if (removedSlice !== null) {
            const lastAction = replay[replay.length - 1];

            replay.push({
                type: "delete",
                slice: removedSlice,
                timestamp: now,
            } satisfies Delete);

            if (lastAction && lastAction.type === "caret") {
                if (inputElement === null) {
                    return;
                }

                const selectionStart = inputElement.selectionStart;
                const selectionEnd = inputElement.selectionEnd;

                if (selectionStart === null || selectionEnd === null) {
                    return;
                }

                replay.push({
                    type: "caret",
                    start: selectionStart,
                    end: selectionEnd,
                    timestamp: now,
                } satisfies CaretMovement);
            }
        }

        // Checking if the word is completed
        if (
            newChar === " " &&
            startedRoomInfo.quote.text[currentWordIndex] ===
                wordsTyped.slice(currentWordIndex).join(" ")
        ) {
            wordInput = "";
            currentWordIndex++;
        }

        if (newChar !== null) {
            replay.push({
                type: "character",
                letter: newChar,
                timestamp: now,
            } satisfies Character);
        }

        replay = replay;
    };

    const checkForCursorEvent = () => {
        setTimeout(() => {
            if (inputElement === null) return;

            const now = Date.now();

            const selectionStart = inputElement.selectionStart;
            const selectionEnd = inputElement.selectionEnd;

            // Checking if there is any selection data
            if (selectionStart === null || selectionEnd === null) return;

            // Checking if the caret is at the end of the word and not selecting
            if (
                selectionEnd === selectionStart &&
                selectionEnd === wordInput.length &&
                !(replay[replay.length - 1]?.type === "caret")
            )
                return;

            // Checking if the selections are greater than the word length
            if (
                selectionStart > wordInput.length ||
                selectionEnd > wordInput.length
            )
                return;

            replay.push({
                type: "caret",
                start: selectionStart,
                end: selectionEnd,
                timestamp: now,
            } satisfies CaretMovement);

            replay = replay;
        });
    };
</script>

<input
    type="text"
    lang="en"
    autocomplete="new-password"
    autocorrect="off"
    autocapitalize="off"
    spellcheck="false"
    maxlength={50}
    placeholder={replay.length === 0 ? "Type here" : ""}
    class="w-full p-3 outline-none border-zinc-500 border rounded-md"
    on:keydown={checkForCursorEvent}
    on:mousedown={checkForCursorEvent}
    on:click={checkForCursorEvent}
    on:select={checkForCursorEvent}
    bind:value={wordInput}
    on:input={handleInput}
    bind:this={inputElement}
/>
