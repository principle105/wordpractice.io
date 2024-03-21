<script lang="ts">
    import { DEFAULT_LINES_SHOWN } from "$lib/config";
    import type { MatchUser, Replay, RoomInfo } from "$lib/types";
    import {
        convertReplayToText,
        getCompletedAndIncorrectWords,
    } from "$lib/utils";

    import Cursor from "./Cursor.svelte";

    export let roomInfo: RoomInfo;
    export let fontSize: number;
    export let completedWords: string;
    export let incorrectChars: number;
    export let timingOffset = 0;

    export let replay: Replay;
    export let matchUsers: MatchUser[];

    let wrapperElement: HTMLElement | null = null;
    let topPos = 0;

    $: maxHeight =
        wrapperElement !== null
            ? wrapperElement.offsetHeight - DEFAULT_LINES_SHOWN * fontSize * 1.5
            : 0;
</script>

<div
    class="whitespace-pre-line relative font-mono overflow-hidden mt-4 mb-2"
    style="font-size: {fontSize}px; height: {fontSize * 0.15 +
        fontSize * DEFAULT_LINES_SHOWN * 1.5}px;"
>
    <div
        bind:this={wrapperElement}
        class="absolute left-0 ease-in duration-300 bg-green-400"
        style="top: -{Math.min(topPos, maxHeight)}px; transition: top 0.08s;"
    >
        <span class="text-black">{completedWords}</span><span class="bg-red-400"
            >{roomInfo.quote
                .join(" ")
                .slice(
                    completedWords.length,
                    completedWords.length + incorrectChars
                )}</span
        ><span class="text-zinc-500"
            >{roomInfo.quote
                .join(" ")
                .slice(completedWords.length + incorrectChars)}</span
        >
        {#each matchUsers as matchUser}
            {@const { completedWords } = getCompletedAndIncorrectWords(
                convertReplayToText(matchUser.replay),
                roomInfo.quote
            )}

            <Cursor
                {fontSize}
                {timingOffset}
                replay={matchUser.replay}
                {completedWords}
                {wrapperElement}
                name={matchUser.name}
                quote={roomInfo.quote}
            />
        {/each}
    </div>
    <Cursor
        {fontSize}
        {timingOffset}
        {replay}
        {completedWords}
        {wrapperElement}
        bind:topPos
        quote={roomInfo.quote}
    />
</div>
