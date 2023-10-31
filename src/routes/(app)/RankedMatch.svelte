<script lang="ts">
    // TODO: add max wrong characters and add server-side validation for it
    import type {
        CaretMovement,
        Character,
        Delete,
        MatchUser,
        Replay,
        RoomInfo,
    } from "$lib/types";
    import { convertReplayToText, getCorrect } from "$lib/utils";
    import OpponentDisplay from "./OpponentDisplay.svelte";
    import Cursor from "./Cursor.svelte";
    import type { EventHandler } from "svelte/elements";
    import { useMatchMode } from "$lib/stores/store";

    const match = useMatchMode();

    export let userId: string;
    export let rating: number;
    export let roomInfo: RoomInfo;
    export let matchUsers = new Map<string, MatchUser>();
    export let replay: Replay = [];
    export let started: boolean;

    const fontSize: number = 30;

    let currentIndex: number = 0;
    let currentWordInput: string = "";

    let wrapperElement: HTMLElement | null = null;
    let inputElement: HTMLInputElement | null = null;

    let wpm: number = 0;
    let finished: boolean = false;

    $: replayText = convertReplayToText(replay).split(" ");
    $: ({ correct, incorrectChars } = getCorrect(replayText, roomInfo.quote));
    $: started, inputElement, checkStart();

    const checkStart = () => {
        if (!started) return;

        inputElement?.focus();
    };

    const findRemovedSlice = (
        totalText: String,
        originalText: String,
        newText: String
    ) => {
        if (newText.length >= originalText.length) {
            return null;
        }

        let startIndex = 0;
        while (
            startIndex < newText.length &&
            originalText[startIndex] === newText[startIndex]
        ) {
            startIndex++;
        }

        let endIndex = 0;
        while (
            endIndex < newText.length &&
            originalText[originalText.length - 1 - endIndex] ===
                newText[newText.length - 1 - endIndex]
        ) {
            endIndex++;
        }

        return [
            totalText.length + startIndex + (totalText.length !== 0 ? 1 : 0),
            totalText.length +
                originalText.length -
                endIndex +
                (totalText.length !== 0 ? 1 : 0),
        ] as [number, number];
    };

    const handleInput: EventHandler<Event, HTMLInputElement> = (e) => {
        if (e.target === null) return;

        const newChar = (e as any as InputEvent).data;

        let removedSlice = findRemovedSlice(
            roomInfo.quote.slice(0, currentIndex).join(" "),
            replayText.slice(currentIndex).join(" "),
            currentWordInput
        );

        if (removedSlice !== null) {
            replay.push({
                type: "delete",
                slice: removedSlice,
                timestamp: Date.now(),
            } satisfies Delete);
        }

        if (
            newChar === " " &&
            roomInfo.quote[currentIndex] ===
                replayText.slice(currentIndex).join(" ")
        ) {
            currentWordInput = "";
            currentIndex++;
        }

        if (newChar !== null) {
            replay.push({
                type: "character",
                letter: newChar,
                timestamp: Date.now(),
            } satisfies Character);
        }

        replay = replay;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        const target = e.target as HTMLInputElement;

        const selectionStart = target.selectionStart;
        const selectionEnd = target.selectionEnd;

        // Checking if the cursor is at the end of the word and not selecting
        if (
            selectionStart === null ||
            selectionEnd === null ||
            (selectionEnd === selectionStart &&
                selectionEnd === currentWordInput.length)
        ) {
            return;
        }
        replay.push({
            type: "caret",
            start: selectionStart,
            end: selectionEnd,
            timestamp: Date.now(),
        } satisfies CaretMovement);
    };

    $: matchUser = {
        id: userId,
        name: "You",
        replay,
        rating,
    };
</script>

<div class="flex flex-col">
    <OpponentDisplay user={matchUser} {roomInfo} bind:wpm bind:finished />
    {#each matchUsers as [_, matchUser]}
        <OpponentDisplay user={matchUser} {roomInfo} />
    {/each}
</div>

<div
    class="whitespace-pre-line relative font-mono"
    style="font-size: {fontSize}px"
>
    <span bind:this={wrapperElement}>
        <span class="text-black">{correct}</span><span class="bg-red-400"
            >{roomInfo.quote
                .join(" ")
                .slice(correct.length, correct.length + incorrectChars)}</span
        ><span class="text-zinc-500"
            >{roomInfo.quote
                .join(" ")
                .slice(correct.length + incorrectChars)}</span
        >
        <Cursor
            {fontSize}
            {replay}
            {correct}
            {wrapperElement}
            quote={roomInfo.quote}
        />
        {#each matchUsers as [_, matchUser]}
            <Cursor
                {fontSize}
                replay={matchUser.replay}
                correct={getCorrect(
                    convertReplayToText(matchUser.replay).split(" "),
                    roomInfo.quote
                ).correct}
                {wrapperElement}
                name={matchUser.name}
                quote={roomInfo.quote}
            />
        {/each}
    </span>
</div>

{#if finished}
    <div class="mt-16 flex flex-col justify-center">
        <h2 class="text-3xl">Your Stats</h2>
        <div>
            <div>{wpm} wpm</div>
        </div>
    </div>
    <button
        class="bg-emerald-500 p-3 rounded-md text-white"
        on:click={() => match.set(null)}>Play Again</button
    >
{:else}
    <input
        type="text"
        lang="en"
        autocomplete="new-password"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        maxlength={50}
        placeholder={replayText.join(" ") === "" ? "Type here" : ""}
        class="w-full p-3 outline-none border-zinc-500 border rounded-md"
        on:keyup={handleKeyUp}
        bind:value={currentWordInput}
        on:input={handleInput}
        bind:this={inputElement}
    />
{/if}
