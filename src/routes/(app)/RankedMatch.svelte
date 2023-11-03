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
    import type { EventHandler } from "svelte/elements";
    import type { User } from "lucia";
    import { convertReplayToText, getCorrect } from "$lib/utils";
    import OpponentDisplay from "./OpponentDisplay.svelte";
    import { useMatchMode } from "$lib/stores/store";
    import { BASE_FONT_SIZE } from "$lib/config";
    import ReplayText from "./ReplayText.svelte";
    import WordDisplay from "./WordDisplay.svelte";

    const match = useMatchMode();

    export let user: User;
    export let roomInfo: RoomInfo;
    export let matchUsers = new Map<string, MatchUser>();
    export let replay: Replay = [];
    export let started: boolean;

    let showReplay: boolean = false;

    const fontSize: number = user.fontScale * BASE_FONT_SIZE;

    let currentWordIndex: number = 0;
    let wordInput: string = "";

    let inputElement: HTMLInputElement | null = null;

    let wpm: number = 0;
    let isFinished: boolean = false;

    $: replayText = convertReplayToText(replay);
    $: ({ correct: correctInput, incorrectChars } = getCorrect(
        replayText,
        roomInfo.quote
    ));
    $: started, inputElement, focusInputWhenRaceStarts();
    $: matchUser = {
        id: user.userId,
        name: user.name,
        replay,
        rating: user.rating,
    } satisfies MatchUser;

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

        const newChar = (e as any as InputEvent).data;

        let removedSlice = findRemovedSlice(
            roomInfo.quote.slice(0, currentWordIndex).join(" "),
            replayText.slice(currentWordIndex).join(" "),
            wordInput
        );

        if (removedSlice !== null) {
            replay.push({
                type: "delete",
                slice: removedSlice,
                timestamp: Date.now(),
            } satisfies Delete);
        }

        // Checking if the word is completed
        if (
            newChar === " " &&
            roomInfo.quote[currentWordIndex] ===
                replayText.slice(currentWordIndex).join(" ")
        ) {
            wordInput = "";
            currentWordIndex++;
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
            timestamp: Date.now(),
        } satisfies CaretMovement);

        replay = replay;
    };
</script>

<div class="flex flex-col">
    <OpponentDisplay
        user={matchUser}
        {roomInfo}
        bind:wpm
        bind:finished={isFinished}
    />
    {#each matchUsers as [_, matchUser]}
        <OpponentDisplay user={matchUser} {roomInfo} />
    {/each}
</div>

<WordDisplay
    {correctInput}
    {incorrectChars}
    {fontSize}
    matchUsers={Array.from(matchUsers.values())}
    {replay}
    {roomInfo}
/>

{#if isFinished}
    <div class="mt-16 flex flex-col justify-center">
        <h2 class="text-3xl">Your Stats</h2>
        <div>
            <div>{wpm} wpm</div>
        </div>
    </div>
    <button
        class="bg-zinc-500 p-3 rounded-md text-white"
        on:click={() => (showReplay = true)}
    >
        Replay
    </button>
    <button
        class="bg-emerald-500 p-3 rounded-md text-white"
        on:click={() => match.set(null)}
    >
        Play Again
    </button>
    {#if showReplay}
        <ReplayText {fontSize} {replay} {roomInfo} />
    {/if}
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
        bind:value={wordInput}
        on:input={handleInput}
        bind:this={inputElement}
    />
{/if}
