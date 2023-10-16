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

    export let userName: string;
    export let roomInfo: RoomInfo;
    export let matchUsers = new Map<string, MatchUser>();
    export let replay: Replay = [];

    let currentIndex: number = 0;
    let currentWordInput: string = "";

    const handleInput = (e: InputEvent) => {
        if (e.target === null) return;

        let charsRemoved =
            replayText.slice(currentIndex).join(" ").length -
            currentWordInput.length;

        if (e.data !== null) {
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
            e.data === " " &&
            roomInfo.quote[currentIndex] ===
                replayText.slice(currentIndex).join(" ")
        ) {
            currentWordInput = "";
            currentIndex++;
        }

        if (e.data !== null) {
            replay.push({
                type: "character",
                letter: e.data,
                timestamp: Date.now(),
            } satisfies Character);
        }

        replay = replay;
    };

    $: replayText = convertReplayToText(replay).split(" ");
    $: ({ correct, incorrectChars } = getCorrect(replayText, roomInfo.quote));

    let wrapperElement: HTMLElement | null = null;
    const fontSize: number = 30;
</script>

<OpponentDisplay name={userName} {replay} {roomInfo} />

{#each matchUsers as [_, matchUser]}
    <OpponentDisplay
        name={matchUser.name}
        replay={matchUser.replay}
        {roomInfo}
    />
{/each}

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
    autofocus
/>
