<script lang="ts">
    import type { EventHandler } from "svelte/elements";
    import type {
        CaretMovement,
        Character,
        Delete,
        Replay,
        BasicRoomInfoStarted,
    } from "$lib/types";
    import { convertReplayToWords } from "$lib/utils/textProcessing";

    export let startedRoomInfo: BasicRoomInfoStarted;
    export let replay: Replay;
    export let started: boolean;

    $: wordsTyped = convertReplayToWords(replay, startedRoomInfo.quote);

    let currentWordIndex = 0;
    let wordInput = "";

    let inputElement: HTMLInputElement | null = null;

    $: started, inputElement, focusInputWhenRaceStarts();

    const focusInputWhenRaceStarts = () => {
        if (!started) return;

        inputElement?.focus();
    };

    const findRemovedSlice = (
        wordBefore: string,
        wordAfter: string,
        newChar: string | null
    ): [number, number] | null => {
        if (newChar !== null) {
            wordAfter = wordAfter.slice(0, -1);
        }

        let i = 0;
        while (i < wordBefore.length && i < wordAfter.length) {
            if (wordBefore[i] !== wordAfter[i]) {
                break;
            }
            i++;
        }

        if (i === wordBefore.length) {
            return null;
        }

        return [i, wordBefore.length];
    };

    const handleInput: EventHandler<Event, HTMLInputElement> = (e) => {
        if (e.target === null) return;

        const now = Date.now();

        const newChar = (e as any as InputEvent).data;

        let removedSlice = findRemovedSlice(
            wordsTyped[wordsTyped.length - 1],
            wordInput,
            newChar
        );

        if (removedSlice !== null) {
            replay.push({
                type: "delete",
                slice: removedSlice,
                timestamp: now,
            } satisfies Delete);

            if (inputElement === null) {
                return;
            }

            const selectionStart = inputElement.selectionStart;
            const selectionEnd = inputElement.selectionEnd;

            if (selectionStart === null || selectionEnd === null) {
                return;
            }

            // TODO: Limit doing this only when the caret has actually moved
            replay.push({
                type: "caret",
                start: selectionStart,
                end: selectionEnd,
                timestamp: now,
            } satisfies CaretMovement);
        }

        // Checking if the word is completed
        if (
            newChar === " " &&
            startedRoomInfo.quote[currentWordIndex] ===
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

            // Checking if the caret is at the end of the word and not selecting
            if (
                selectionStart === null ||
                selectionEnd === null ||
                (selectionEnd === selectionStart &&
                    selectionEnd === wordInput.length &&
                    !(replay[replay.length - 1]?.type === "caret"))
            ) {
                return;
            }
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
    placeholder={wordsTyped.join(" ") === "" ? "Type here" : ""}
    class="w-full p-3 outline-none border-zinc-500 border rounded-md"
    on:keydown={checkForCursorEvent}
    bind:value={wordInput}
    on:input={handleInput}
    bind:this={inputElement}
/>
