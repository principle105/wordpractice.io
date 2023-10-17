<script lang="ts">
    // TODO: add max wrong characters and add server-side validation for it
    import type {
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

    export let userName: string;
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

    const handleInput: EventHandler<Event, HTMLInputElement> = (e) => {
        if (e.target === null) return;

        const newChar = (e as any as InputEvent).data;

        let charsRemoved =
            replayText.slice(currentIndex).join(" ").length -
            currentWordInput.length;

        if (newChar !== null) {
            charsRemoved++;
        }

        if (charsRemoved > 0) {
            replay.push({
                type: "delete",
                amount: charsRemoved,
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
</script>

<div class="flex flex-col">
    <OpponentDisplay
        name={userName}
        {replay}
        {roomInfo}
        bind:wpm
        bind:finished
    />
    {#each matchUsers as [_, matchUser]}
        <OpponentDisplay
            name={matchUser.name}
            replay={matchUser.replay}
            {roomInfo}
        />
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
        <Cursor {fontSize} {replay} {correct} {wrapperElement} />
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
        bind:value={currentWordInput}
        on:input={handleInput}
        bind:this={inputElement}
    />
{/if}
