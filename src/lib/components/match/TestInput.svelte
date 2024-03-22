<script lang="ts">
    import type { EventHandler } from "svelte/elements";
    import type {
        CaretMovement,
        Character,
        Delete,
        Replay,
        RoomInfo,
    } from "$lib/types";
    import { convertReplayToText } from "$lib/utils";

    export let roomInfo: RoomInfo;
    export let replay: Replay;
    export let started: boolean;

    $: wordsTyped = convertReplayToText(replay);

    let currentWordIndex = 0;
    let wordInput = "";

    let inputElement: HTMLInputElement | null = null;

    $: started, inputElement, focusInputWhenRaceStarts();

    const focusInputWhenRaceStarts = () => {
        if (!started) return;

        inputElement?.focus();
    };

    const findRemovedSlice = (
        totalText: string,
        beforeDelete: string,
        afterDelete: string
    ) => {
        if (afterDelete.length >= beforeDelete.length) {
            return null;
        }

        let startIndex = 0;
        while (
            startIndex < afterDelete.length &&
            beforeDelete[startIndex] === afterDelete[startIndex]
        ) {
            startIndex++;
        }

        let endIndex = 0;
        while (
            endIndex < afterDelete.length &&
            beforeDelete[beforeDelete.length - 1 - endIndex] ===
                afterDelete[afterDelete.length - 1 - endIndex]
        ) {
            endIndex++;
        }

        return [
            totalText.length + startIndex + (totalText.length !== 0 ? 1 : 0),
            totalText.length +
                beforeDelete.length -
                endIndex +
                (totalText.length !== 0 ? 1 : 0),
        ] as [number, number];
    };

    const handleInput: EventHandler<Event, HTMLInputElement> = (e) => {
        if (e.target === null) return;

        const now = Date.now();

        const newChar = (e as any as InputEvent).data;

        let removedSlice = findRemovedSlice(
            roomInfo.quote.slice(0, currentWordIndex).join(" "),
            wordsTyped.slice(currentWordIndex).join(" "),
            wordInput
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
            roomInfo.quote[currentWordIndex] ===
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
