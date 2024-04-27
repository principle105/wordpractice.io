<script lang="ts">
    import { DEFAULT_MAX_LINES_SHOWN } from "$lib/config";
    import type { MatchUser, Replay, BasicRoomInfoStarted } from "$lib/types";
    import {
        convertReplayToWords,
        getCompletedAndIncorrectWords,
    } from "$lib/utils/textProcessing";

    import Cursor from "./Cursor.svelte";

    export let startedRoomInfo: BasicRoomInfoStarted;
    export let fontSize: number;
    export let timingOffset = 0;

    export let replay: Replay;
    export let matchUsers: MatchUser[];

    let wrapperElement: HTMLElement | null = null;
    let topPos = 0;

    $: maxHeight =
        wrapperElement !== null
            ? wrapperElement.offsetHeight -
              DEFAULT_MAX_LINES_SHOWN * fontSize * 1.5
            : 0;

    $: wordsTyped = convertReplayToWords(replay, startedRoomInfo.quote);

    $: ({ completedWords, incorrectChars } = getCompletedAndIncorrectWords(
        wordsTyped,
        startedRoomInfo.quote
    ));

    const updateWrapperSize = () => {
        // Force updating the wrapper size
        wrapperElement = wrapperElement;
    };
</script>

<svelte:window on:resize={updateWrapperSize} />

<div
    class="whitespace-pre-line font-mono overflow-hidden my-4 relative"
    style="font-size: {fontSize}px; max-height: {fontSize * 0.15 +
        fontSize * DEFAULT_MAX_LINES_SHOWN * 1.5}px;"
>
    <div
        class="ease-in transition-[margin-top] relative duration-150"
        style="margin-top: -{Math.min(topPos, maxHeight)}px;"
        bind:this={wrapperElement}
    >
        <span class="text-black">{completedWords}</span><span class="bg-red-400"
            >{startedRoomInfo.quote
                .join(" ")
                .slice(
                    completedWords.length,
                    completedWords.length + incorrectChars
                )}</span
        ><span class="text-zinc-500"
            >{startedRoomInfo.quote
                .join(" ")
                .slice(completedWords.length + incorrectChars)}</span
        >
        {#each matchUsers as matchUser}
            <Cursor
                {fontSize}
                {timingOffset}
                replay={matchUser.replay}
                {wrapperElement}
                username={matchUser.username}
                quote={startedRoomInfo.quote}
            />
        {/each}
    </div>
    <Cursor
        {fontSize}
        {timingOffset}
        {replay}
        {wrapperElement}
        bind:topPos
        quote={startedRoomInfo.quote}
    />
</div>
